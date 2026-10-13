import type { DictionaryFile, SourceRange } from "../utils/dictionary/index.js";

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
  exclude?: string[];
  /** `lint.rules` of the config: `"off"` drops an issue, `"warn"` and `"error"` set its level. */
  lint?: { rules?: Record<string, LintSetting> };
}

export type LintLevel = "off" | "warn" | "error";

/** A rule as written in the config: `"warn"` or `["warn", { ...options }]`. */
export type LintSetting = LintLevel | readonly [LintLevel, unknown?];

/**
 * Remembers parsed dictionaries and scanned source files between `analyzeProject` calls, keyed by
 * modification time and size, so a long-lived caller (the editor extension) only re-reads what
 * changed. Create one with {@link createAnalysisCache}; one-shot callers do not need it.
 */
export interface AnalysisCache {
  dictionaries: Map<string, { stamp: string; loaded: Loaded }>;
  sources: Map<string, { stamp: string; scan: SourceScan }>;
  /** The `.gitignore` filter, reused until {@link clearGitignore} is called. */
  gitignore: Map<string, (absolutePath: string) => boolean>;
}

export interface SourceScan {
  /** Distinct word-like tokens, for the unused-key heuristic. */
  tokens: string[];
  refs: { ref: Reference; range: SourceRange }[];
  /** Dictionary names registered inline with `dictionaries: { name: ... }`. */
  inline: string[];
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
  /** Reuse work between calls. Ignored when `runtime` is set, because that evaluates code. */
  cache?: AnalysisCache;
  /** Unsaved text of files, by absolute path, used instead of reading them from disk. */
  contents?: ReadonlyMap<string, string>;
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
  /** Dictionary names registered in code with `dictionaries: { name: ... }`. Empty without `src`. */
  inlineDictionaries: string[];
}

export interface Reference {
  /** A dictionary name, or a full `dictionary.key.path`. */
  kind: "dictionary" | "path";
  value: string;
  /** Offsets of the string's contents (without the quotes) in the scanned text. */
  start: number;
  end: number;
}

export interface DictionaryData {
  name: string;
  locales: string[];
  leaves: Map<string, Map<string, LeafInfo>>;
  df?: DictionaryFile;
}

export type Loaded =
  | { ok: true; data: DictionaryData }
  | { ok: false; level: IssueLevel; code: IssueCode; message: string };

/** What the analysis needs next: a dictionary file loaded. The driver answers with the result. */
export interface LoadRequest {
  file: string;
  runtime: boolean;
  cache: AnalysisCache | undefined;
  /** Unsaved text to read instead of the file. Such a load is never cached. */
  text: string | undefined;
}
