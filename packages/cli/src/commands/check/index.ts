import path from "node:path";

import pc from "picocolors";

import { analyzeProject } from "../../analysis/index.js";
import { TODO_PREFIX } from "../../utils/dictionary/index.js";
import { scanFiles } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";
import { resolveDialexConfig } from "../../utils/scanner.js";
import { applyFixes } from "./fix.js";
import { addIssue, escapeAnnotation } from "./report.js";
import { staleGeneratedFiles } from "./stale-generated.js";
import type { CheckDiagnostic, CheckOptions, CheckResult } from "./types.js";

export type { CheckAnnotation, CheckDiagnostic, CheckOptions, CheckResult } from "./types.js";
export { normalizeGenerated } from "./stale-generated.js";

export async function runCheck(options: CheckOptions = {}): Promise<CheckResult> {
  const root = options.cwd || process.cwd();
  const quiet = options.json === true;
  const inlineConfig = options.config ? { configFile: options.config } : {};
  const config = resolveDialexConfig(root, inlineConfig);
  const include = config.include || "**/*.content.ts";
  const configuredLocales = config.locales || [];
  const defaultLocale = config.defaultLocale || "en";

  const files = scanFiles(root, include, { exclude: config.exclude });

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
