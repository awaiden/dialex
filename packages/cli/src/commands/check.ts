import fs from "node:fs";
import path from "node:path";

import fg from "fast-glob";
import pc from "picocolors";

import { analyzeProject, type AnalysisIssue } from "../analysis.js";
import {
  TODO_PREFIX,
  copyLeaf,
  hasPath,
  listLeaves,
  listLocales,
  loadDictionaryFile,
  saveDictionaryFile,
} from "../utils/dictionary-edit.js";
import { logger } from "../utils/logger.js";
import { resolveDialexConfig } from "../utils/scanner.js";
import { renderGenerated } from "./generate.js";

export interface CheckOptions {
  cwd?: string;
  config?: string;
  exitOnError?: boolean;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
  /** Also print GitHub Actions workflow annotations. */
  github?: boolean;
  /** Insert missing keys (marked with `[TODO]`) before checking. */
  fix?: boolean;
  /** Globs of source files to scan for dictionary references. */
  src?: string[];
  /** Report translations whose source text changed since they were translated as errors. */
  failOnStale?: boolean;
}

export interface CheckAnnotation {
  level: "error" | "warning";
  message: string;
  line?: number;
}

export interface CheckDiagnostic {
  file: string;
  name?: string;
  errors: string[];
  warnings: string[];
  annotations: CheckAnnotation[];
}

export interface CheckResult {
  success: boolean;
  diagnostics: CheckDiagnostic[];
  totalIssues: number;
  totalWarnings: number;
  /** Number of missing keys inserted by `--fix`, plus generated files it rewrote. */
  fixed: number;
}

const DICTIONARY_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/dialex.locales/**",
];

function addIssue(diag: CheckDiagnostic, issue: AnalysisIssue) {
  const level = issue.level === "error" ? "error" : "warning";
  (level === "error" ? diag.errors : diag.warnings).push(issue.message);
  diag.annotations.push({
    level,
    message: issue.message,
    line: issue.range ? issue.range.start.line + 1 : undefined,
  });
}

/**
 * Inserts keys that exist in one locale but not in another, copying the default-locale value
 * (strings get a `[TODO]` prefix). Returns how many keys were inserted.
 */
async function applyFixes(
  files: string[],
  configuredLocales: string[],
  defaultLocale: string,
): Promise<number> {
  let fixed = 0;

  for (const file of files) {
    const df = await loadDictionaryFile(file);
    // Spreads and computed keys hide keys from the syntax tree; inserting would be guesswork.
    if (!df?.complete) continue;

    const present = listLocales(df);
    const targets = Array.from(new Set([...present, ...configuredLocales]));
    const sourceOrder = [defaultLocale, ...present.filter((l) => l !== defaultLocale)].filter((l) =>
      present.includes(l),
    );

    const allPaths = new Map<string, string[]>();
    for (const locale of present) {
      for (const leaf of listLeaves(df, locale)) allPaths.set(leaf.path.join("\u0000"), leaf.path);
    }

    let changed = false;
    for (const target of targets) {
      for (const leafPath of allPaths.values()) {
        if (hasPath(df, target, leafPath)) continue;
        const source = sourceOrder.find((l) => l !== target && hasPath(df, l, leafPath));
        if (source && copyLeaf(df, source, target, leafPath, (v) => `${TODO_PREFIX}${v}`)) {
          fixed++;
          changed = true;
        }
      }
    }

    if (changed) await saveDictionaryFile(df);
  }

  return fixed;
}

function escapeAnnotation(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * What a formatter (Prettier, Biome, oxfmt) can change without changing the code: whitespace,
 * quote style, quoted object keys and trailing commas. Comparing this form keeps `check` quiet
 * when your pre-commit hook formats the generated files.
 */
export function normalizeGenerated(text: string): string {
  return text
    .replace(/'/g, '"')
    .replace(/"([A-Za-z_$][\w$]*)"\s*:/g, "$1:")
    .replace(/\s+/g, "")
    .replace(/,(?=[\]})])/g, "");
}

/**
 * Generated files that exist but no longer match the dictionaries and config. Nothing builds them
 * for you any more, so a stale `dialex.generated.ts` would otherwise fail silently at runtime.
 * With `fix` they are rewritten.
 */
function staleGeneratedFiles(
  root: string,
  options: CheckOptions,
): { stale: { file: string; message: string }[]; rewritten: number } {
  let rendered;
  try {
    rendered = renderGenerated(root, { config: options.config });
  } catch {
    return { stale: [], rewritten: 0 }; // not renderable (for example lazy mode with an unreadable name); `generate` reports it
  }
  const stale: { file: string; message: string }[] = [];
  let rewritten = 0;
  const targets: [string, string | undefined][] = [
    [rendered.outputPath, rendered.content],
    [rendered.dtsPath, rendered.dtsContent],
  ];
  // Per-locale modules belong to the same generation: once the generated file exists they must too
  if (fs.existsSync(rendered.outputPath)) {
    for (const extra of rendered.extraFiles) targets.push([extra.path, extra.content]);
  }
  for (const [file, content] of targets) {
    if (content === undefined) continue;
    const isExtra = rendered.extraFiles.some((f) => f.path === file);
    if (!fs.existsSync(file)) {
      if (!isExtra) continue;
      if (options.fix) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, "utf-8");
        rewritten++;
      } else {
        stale.push({
          file: path.relative(root, file),
          message: "Missing. Run `dx generate` (or `dx check --fix`).",
        });
      }
      continue;
    }
    if (normalizeGenerated(fs.readFileSync(file, "utf-8")) === normalizeGenerated(content))
      continue;
    if (options.fix) {
      fs.writeFileSync(file, content, "utf-8");
      rewritten++;
    } else {
      stale.push({
        file: path.relative(root, file),
        message:
          "Out of date with your dictionaries or config. Run `dx generate` (or `dx check --fix`).",
      });
    }
  }
  return { stale, rewritten };
}

export async function runCheck(options: CheckOptions = {}): Promise<CheckResult> {
  const root = options.cwd || process.cwd();
  const quiet = options.json === true;
  const inlineConfig = options.config ? { configFile: options.config } : {};
  const config = resolveDialexConfig(root, inlineConfig);
  const include = config.include || "**/*.content.ts";
  const configuredLocales = config.locales || [];
  const defaultLocale = config.defaultLocale || "en";

  const files = fg.sync(include, { cwd: root, absolute: true, ignore: DICTIONARY_IGNORE });

  if (files.length === 0) {
    if (!quiet) {
      const patternStr = Array.isArray(include) ? include.join(", ") : include;
      logger.warn(`No dictionary files found matching "${patternStr}".`);
    }
    const empty: CheckResult = {
      success: true,
      diagnostics: [],
      totalIssues: 0,
      totalWarnings: 0,
      fixed: 0,
    };
    if (quiet) console.log(JSON.stringify(empty, null, 2));
    return empty;
  }

  let fixed = 0;
  if (options.fix) {
    fixed = await applyFixes(files, configuredLocales, defaultLocale);
    if (fixed > 0 && !quiet) {
      logger.success(
        `Inserted ${fixed} missing key${fixed === 1 ? "" : "s"} marked ${TODO_PREFIX.trim()}`,
      );
    }
  }

  const generated = staleGeneratedFiles(root, options);
  fixed += generated.rewritten;
  if (generated.rewritten > 0 && !quiet) {
    logger.success(
      `Regenerated ${generated.rewritten} out-of-date generated file${generated.rewritten === 1 ? "" : "s"}`,
    );
  }

  const analysis = await analyzeProject({
    root,
    config,
    src: options.src && options.src.length > 0 ? options.src : undefined,
    runtime: true,
  });

  // Group issues per file, dictionary files first (the analysis reports them first)
  const byFile = new Map<string, CheckDiagnostic>();
  const dictionaryFiles = new Set(analysis.files);
  for (const issue of analysis.issues) {
    if (options.failOnStale && issue.code === "stale-translation") issue.level = "error";
    if (issue.level === "info") continue;
    const rel = path.relative(root, issue.file);
    let diag = byFile.get(rel);
    if (!diag) {
      diag = { file: rel, errors: [], warnings: [], annotations: [] };
      byFile.set(rel, diag);
    }
    if (dictionaryFiles.has(issue.file) && issue.dictionary && !diag.name)
      diag.name = issue.dictionary;
    addIssue(diag, issue);
  }
  for (const { file, message } of generated.stale) {
    let diag = byFile.get(file);
    if (!diag) {
      diag = { file, errors: [], warnings: [], annotations: [] };
      byFile.set(file, diag);
    }
    diag.errors.push(message);
    diag.annotations.push({ level: "error", message });
  }
  const diagnostics = [...byFile.values()];

  const totalIssues = diagnostics.reduce((n, d) => n + d.errors.length, 0);
  const totalWarnings = diagnostics.reduce((n, d) => n + d.warnings.length, 0);
  const reported = diagnostics.filter((d) => d.errors.length > 0 || d.warnings.length > 0);
  const result: CheckResult = {
    success: totalIssues === 0,
    diagnostics: reported,
    totalIssues,
    totalWarnings,
    fixed,
  };

  if (options.github) {
    for (const d of reported) {
      for (const a of d.annotations) {
        const location = `file=${d.file}${a.line ? `,line=${a.line}` : ""}`;
        console.log(`::${a.level} ${location},title=dialex::${escapeAnnotation(a.message)}`);
      }
    }
  }

  if (quiet) {
    console.log(JSON.stringify(result, null, 2));
  } else if (reported.length > 0) {
    logger.log("");
    if (totalIssues > 0) {
      logger.error(
        `Found ${totalIssues} issue${totalIssues === 1 ? "" : "s"} across ${reported.filter((d) => d.errors.length > 0).length} file${reported.length === 1 ? "" : "s"}:`,
      );
    }
    logger.log("");

    for (const d of reported) {
      logger.log(`  ${pc.underline(pc.bold(d.file))} ${d.name ? pc.dim(`(${d.name})`) : ""}:`);
      for (const a of d.annotations) {
        const where = a.line ? pc.dim(`:${a.line}`) : "";
        const mark = a.level === "error" ? pc.red("✖") : pc.yellow("⚠");
        logger.log(`    ${mark} ${a.message}${where}`);
      }
      logger.log("");
    }
  }

  if (totalIssues > 0) {
    if (options.exitOnError !== false) process.exit(1);
    return result;
  }

  if (!quiet) {
    const warningNote =
      totalWarnings > 0 ? ` (${totalWarnings} warning${totalWarnings === 1 ? "" : "s"})` : "";
    logger.success(
      `All ${files.length} dictionary file${files.length === 1 ? "" : "s"} passed checks with 0 issues${warningNote}!`,
    );
  }
  return result;
}
