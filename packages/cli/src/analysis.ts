import { isStale, readLock } from "./utils/lockfile.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fg from "fast-glob";
import {
  TODO_PREFIX,
  dictionaryLocation,
  flattenPaths,
  listLeaves,
  listLocales,
  loadDictionaryFile,
  locationOf,
  type DictionaryFile,
  type SourceRange,
} from "./utils/dictionary-edit.js";
import { checkIcu, type LocaleStrings } from "./utils/icu-check.js";

/**
 * Project analysis shared by `dialex check` and the editor extension.
 *
 * It reads dictionaries from the syntax tree, so it never runs project code. Dictionaries that
 * cannot be read that way (spreads, computed keys, imported values) are skipped with an `info`
 * issue, unless `runtime: true` is passed, in which case they are imported and read from the
 * evaluated module (the CLI does this; editors must not).
 */

export type IssueLevel = "error" | "warning" | "info";

export type IssueCode =
  | "invalid-dictionary"
  | "unanalyzable"
  | "missing-locale"
  | "missing-key"
  | "invalid-locale"
  | "todo-placeholder"
  | "stale-translation"
  | "invalid-icu"
  | "icu-args-mismatch"
  | "icu-plural-categories"
  | "unknown-dictionary"
  | "unknown-path"
  | "unused-key"
  | "unused-dictionary";

export interface AnalysisIssue {
  /** Absolute path of the file the issue is in. */
  file: string;
  level: IssueLevel;
  code: IssueCode;
  message: string;
  /** Where to point, when known. Lines and columns are zero-based. */
  range?: SourceRange;
  /** The dictionary the issue is about, when it is about one. */
  dictionary?: string;
  locale?: string;
  /** Key path within the dictionary. */
  path?: string[];
  /** For `missing-key`: a locale that has the key, to copy it from. */
  sourceLocale?: string;
}

export interface AnalysisConfig {
  defaultLocale?: string;
  locales?: string[];
  include?: string | string[];
}

export interface AnalysisOptions {
  root: string;
  config: AnalysisConfig;
  /** Source globs to scan for dictionary references. Pass `[]` to skip scanning. */
  src?: string[];
  /** Import dictionaries the syntax tree cannot fully describe. Runs project code. */
  runtime?: boolean;
  /** Extra ignore globs, relative to `root`. */
  ignore?: string[];
  /** Report possibly unused keys and dictionaries. @default true */
  unused?: boolean;
  /** Report translations whose source text changed since `dialex.lock.json` recorded them. @default true */
  lock?: boolean;
}

export interface LeafInfo {
  kind: "string" | "function" | "other";
  value?: string;
}

export interface AnalyzedDictionary {
  name: string;
  /** Absolute path. */
  file: string;
  /** Locales in source order. */
  locales: string[];
  /** `locale -> dotted path -> leaf` */
  leaves: Map<string, Map<string, LeafInfo>>;
  /** Union of dotted leaf paths across locales, in order of first appearance. */
  paths: string[];
  /** The parsed file, present when it was read statically. */
  df?: DictionaryFile;
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  dictionaries: AnalyzedDictionary[];
  /** Absolute paths of every dictionary file that matched. */
  files: string[];
  sourceFilesScanned: number;
}

const DICTIONARY_IGNORE = ["**/node_modules/**", "**/dist/**", "**/.next/**"];

export const DEFAULT_SOURCE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}";
const SOURCE_IGNORE = [
  ...DICTIONARY_IGNORE,
  "**/.nuxt/**",
  "**/.output/**",
  "**/.svelte-kit/**",
  "**/.astro/**",
  "**/coverage/**",
  "**/graphify-out/**",
  "**/*.d.ts",
  "**/dialex.generated.*",
  "**/dialex.config.*",
  "**/i18n.config.*",
];

/** `getDictionary("x")`, `useDictionary("x")`, `@DialexDictionary("x")` */
const DICTIONARY_CALL =
  /\b(?:getDictionary|useDictionary|DialexDictionary)\(\s*(["'`])([^"'`$\n]+)\1/dg;
/** `t("dictionary.path.to.key")` */
const T_CALL = /(?<![\w$.])t\(\s*(["'`])([\w-]+(?:\.[\w-]+)+)\1/dg;

export interface Reference {
  /** A dictionary name, or a full `dictionary.key.path`. */
  kind: "dictionary" | "path";
  value: string;
  /** Offsets of the string's contents (without the quotes) in the scanned text. */
  start: number;
  end: number;
}

/** Finds `getDictionary("x")`-style and `t("x.y.z")` references in source text. */
export function scanReferences(text: string): Reference[] {
  const references: Reference[] = [];
  const collect = (pattern: RegExp, kind: Reference["kind"]) => {
    for (const match of text.matchAll(pattern)) {
      const [start, end] = match.indices![2] as [number, number];
      references.push({ kind, value: match[2], start, end });
    }
  };
  collect(DICTIONARY_CALL, "dictionary");
  collect(T_CALL, "path");
  return references.sort((a, b) => a.start - b.start);
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function positionAt(starts: number[], offset: number) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return { line: low, column: offset - starts[low] };
}

interface DictionaryData {
  name: string;
  locales: string[];
  leaves: Map<string, Map<string, LeafInfo>>;
  df?: DictionaryFile;
}

type Loaded =
  | { ok: true; data: DictionaryData }
  | { ok: false; level: IssueLevel; code: IssueCode; message: string };

function fromSyntaxTree(df: DictionaryFile): DictionaryData {
  const locales = listLocales(df);
  const leaves = new Map<string, Map<string, LeafInfo>>();
  for (const locale of locales) {
    const entries = new Map<string, LeafInfo>();
    for (const leaf of listLeaves(df, locale)) {
      entries.set(leaf.path.join("."), { kind: leaf.kind, value: leaf.value });
    }
    leaves.set(locale, entries);
  }
  return { name: df.name!, locales, leaves, df };
}

async function fromRuntime(file: string): Promise<Loaded> {
  try {
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}_${Math.random()}`);
    const definition = mod.default || mod;
    if (!definition || typeof definition !== "object" || !definition.dictionary) {
      return {
        ok: false,
        level: "error",
        code: "invalid-dictionary",
        message: "Default export does not appear to be a valid defineDictionary output.",
      };
    }

    const dictionary = definition.dictionary as Record<string, Record<string, any>>;
    const leaves = new Map<string, Map<string, LeafInfo>>();
    const invalid: string[] = [];

    for (const [locale, content] of Object.entries(dictionary)) {
      if (!content || typeof content !== "object") {
        invalid.push(locale);
        continue;
      }
      const entries = new Map<string, LeafInfo>();
      for (const leafPath of flattenPaths(content)) {
        let value: any = content;
        for (const segment of leafPath) value = value?.[segment];
        entries.set(
          leafPath.join("."),
          typeof value === "string"
            ? { kind: "string", value }
            : { kind: typeof value === "function" ? "function" : "other" },
        );
      }
      leaves.set(locale, entries);
    }

    if (invalid.length > 0) {
      return {
        ok: false,
        level: "error",
        code: "invalid-locale",
        message: invalid.map((l) => `Locale "${l}" content is empty or invalid.`).join("\n"),
      };
    }

    return {
      ok: true,
      data: { name: String(definition.name ?? ""), locales: [...leaves.keys()], leaves },
    };
  } catch (error: any) {
    return {
      ok: false,
      level: "error",
      code: "invalid-dictionary",
      message: `Failed to import dictionary: ${error.message || String(error)}`,
    };
  }
}

async function loadDictionaryData(file: string, runtime: boolean): Promise<Loaded> {
  let astError: Error | undefined;
  try {
    const df = await loadDictionaryFile(file);
    if (df?.complete && df.name) return { ok: true, data: fromSyntaxTree(df) };
  } catch (error) {
    astError = error as Error;
  }

  if (runtime) return fromRuntime(file);

  return astError
    ? {
        ok: false,
        level: "error",
        code: "invalid-dictionary",
        message: `Failed to parse dictionary: ${astError.message}`,
      }
    : {
        ok: false,
        level: "info",
        code: "unanalyzable",
        message:
          "This dictionary uses spreads, computed keys, imported values, or a computed name, so it cannot be analyzed statically.",
      };
}

export async function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult> {
  const { root, config } = options;
  const include = config.include || "**/*.content.ts";
  const configuredLocales = config.locales || [];
  const defaultLocale = config.defaultLocale || "en";
  const extraIgnore = options.ignore ?? [];

  const files = fg.sync(include, {
    cwd: root,
    absolute: true,
    ignore: [...DICTIONARY_IGNORE, ...extraIgnore],
  });

  const issues: AnalysisIssue[] = [];
  const dictionaries: AnalyzedDictionary[] = [];
  const lock = options.lock === false ? undefined : readLock(root);

  // 1. Dictionaries: parity, placeholders, ICU
  for (const file of files) {
    const loaded = await loadDictionaryData(file, options.runtime === true);
    if (!loaded.ok) {
      for (const message of loaded.message.split("\n")) {
        issues.push({ file, level: loaded.level, code: loaded.code, message });
      }
      continue;
    }

    const { data } = loaded;
    const { df } = data;
    const at = (locale?: string, keyPath?: string[]) =>
      df && locale ? locationOf(df, locale, keyPath) : undefined;
    const add = (issue: Omit<AnalysisIssue, "file" | "dictionary">) =>
      issues.push({ ...issue, file, dictionary: data.name });

    for (const required of configuredLocales) {
      if (!data.locales.includes(required)) {
        add({
          level: "error",
          code: "missing-locale",
          message: `Missing configured locale "${required}"`,
          range: df ? dictionaryLocation(df) : undefined,
          locale: required,
        });
      }
    }

    const paths: string[] = [];
    const seen = new Set<string>();
    for (const locale of data.locales) {
      for (const leafPath of data.leaves.get(locale)!.keys()) {
        if (!seen.has(leafPath)) {
          seen.add(leafPath);
          paths.push(leafPath);
        }
      }
    }

    for (const locale of data.locales) {
      const present = data.leaves.get(locale)!;
      for (const leafPath of paths) {
        if (present.has(leafPath)) continue;
        const sourceLocale = [defaultLocale, ...data.locales].find(
          (l) => l !== locale && data.leaves.get(l)?.has(leafPath),
        );
        add({
          level: "error",
          code: "missing-key",
          message: `Locale "${locale}" is missing key "${leafPath}"`,
          range: at(locale),
          locale,
          path: leafPath.split("."),
          sourceLocale,
        });
      }
    }

    const strings: LocaleStrings = new Map();
    for (const locale of data.locales) {
      const entries = new Map<string, string>();
      strings.set(locale, entries);
      for (const [leafPath, leaf] of data.leaves.get(locale)!) {
        if (leaf.kind !== "string" || leaf.value === undefined) continue;
        entries.set(leafPath, leaf.value);
        if (leaf.value.startsWith(TODO_PREFIX)) {
          add({
            level: "warning",
            code: "todo-placeholder",
            message: `Locale "${locale}" key "${leafPath}" still has a ${TODO_PREFIX.trim()} placeholder`,
            range: at(locale, leafPath.split(".")),
            locale,
            path: leafPath.split("."),
          });
        }
      }
    }

    // Translations made from source text that has changed since (see dialex.lock.json)
    const sourceLeaves = lock?.sourceLocale ? data.leaves.get(lock.sourceLocale) : undefined;
    if (lock && sourceLeaves) {
      for (const locale of data.locales) {
        if (locale === lock.sourceLocale) continue;
        for (const [leafPath, leaf] of data.leaves.get(locale)!) {
          if (leaf.kind !== "string" || leaf.value === undefined) continue;
          if (leaf.value.startsWith(TODO_PREFIX)) continue;
          const source = sourceLeaves.get(leafPath);
          if (source?.kind !== "string" || source.value === undefined) continue;
          if (!isStale(lock, locale, `${data.name}.${leafPath}`, source.value)) continue;
          add({
            level: "warning",
            code: "stale-translation",
            message: `Locale "${locale}" key "${leafPath}" is out of date: the "${lock.sourceLocale}" text changed after it was translated`,
            range: at(locale, leafPath.split(".")),
            locale,
            path: leafPath.split("."),
            sourceLocale: lock.sourceLocale,
          });
        }
      }
    }

    for (const finding of checkIcu(data.name, strings, defaultLocale)) {
      const keyPath = finding.key.slice(data.name.length + 1).split(".");
      add({
        level: finding.level,
        code: finding.code,
        message: finding.message,
        range: at(finding.locale, keyPath),
        locale: finding.locale,
        path: keyPath,
      });
    }

    dictionaries.push({
      name: data.name,
      file,
      locales: data.locales,
      leaves: data.leaves,
      paths,
      df,
    });
  }

  // 2. Source code: references to dictionaries and keys
  const known = new Map(dictionaries.map((d) => [d.name, d]));
  const dictionaryFiles = new Set(files);
  const sourceGlobs = options.src ?? [DEFAULT_SOURCE_GLOB];
  const sourceFiles =
    sourceGlobs.length === 0
      ? []
      : fg
          .sync(sourceGlobs, {
            cwd: root,
            absolute: true,
            ignore: [...SOURCE_IGNORE, ...extraIgnore],
          })
          .filter((f) => !dictionaryFiles.has(f));

  if (sourceFiles.length > 0) {
    const tokens = new Set<string>();

    for (const file of sourceFiles) {
      let text: string;
      try {
        text = fs.readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      for (const token of text.match(/[\w$-]+/g) ?? []) tokens.add(token);

      const starts = lineStarts(text);
      const rangeOf = (start: number, end: number): SourceRange => ({
        start: positionAt(starts, start),
        end: positionAt(starts, end),
      });

      for (const ref of scanReferences(text)) {
        if (ref.kind === "dictionary") {
          if (!known.has(ref.value)) {
            issues.push({
              file,
              level: "error",
              code: "unknown-dictionary",
              message: `Unknown dictionary "${ref.value}"`,
              range: rangeOf(ref.start, ref.end),
              dictionary: ref.value,
            });
          }
          continue;
        }

        const [name, ...rest] = ref.value.split(".");
        const dictionary = known.get(name);
        if (!dictionary) continue; // `t(...)` may belong to another library
        const keyPath = rest.join(".");
        const exists = dictionary.paths.some((p) => p === keyPath || p.startsWith(`${keyPath}.`));
        if (!exists) {
          issues.push({
            file,
            level: "error",
            code: "unknown-path",
            message: `Unknown translation path "${ref.value}"`,
            range: rangeOf(ref.start, ref.end),
            dictionary: name,
            path: rest,
          });
        }
      }
    }

    // 3. Possibly unused dictionaries and keys (heuristic: warnings only)
    if (options.unused !== false) {
      for (const dictionary of dictionaries) {
        if (!tokens.has(dictionary.name)) {
          issues.push({
            file: dictionary.file,
            level: "warning",
            code: "unused-dictionary",
            message: `Dictionary "${dictionary.name}" is never referenced`,
            range: dictionary.df ? dictionaryLocation(dictionary.df) : undefined,
            dictionary: dictionary.name,
          });
          continue;
        }
        for (const keyPath of dictionary.paths) {
          const last = keyPath.split(".").pop()!;
          if (tokens.has(last)) continue;
          const holder = dictionary.locales.find((l) => dictionary.leaves.get(l)?.has(keyPath));
          issues.push({
            file: dictionary.file,
            level: "warning",
            code: "unused-key",
            message: `Key "${keyPath}" is possibly unused`,
            range:
              dictionary.df && holder
                ? locationOf(dictionary.df, holder, keyPath.split("."))
                : undefined,
            dictionary: dictionary.name,
            path: keyPath.split("."),
          });
        }
      }
    }
  }

  return { issues, dictionaries, files, sourceFilesScanned: sourceFiles.length };
}

/** Project root-relative path with forward slashes, for display. */
export function relativeFile(root: string, file: string): string {
  return path.relative(root, file);
}
