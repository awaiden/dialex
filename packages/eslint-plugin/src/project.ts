import path from "node:path";

import {
  analyzeProjectSync,
  createAnalysisCache,
  readStaticConfig,
  type AnalysisCache,
  type AnalysisResult,
  type AnalyzedDictionary,
} from "@dialexjs/cli/api";

type Config = ReturnType<typeof readStaticConfig>["config"];

export type LintLevel = "off" | "warn" | "error";

/** What `lint.rules` of `dialex.config.ts` says about one check. */
export interface RuleSetting {
  /** `undefined` when the config does not mention the check. */
  level: LintLevel | undefined;
  options: Record<string, unknown>;
}

/** Reads `lint.rules[code]`, whether written as `"warn"` or `["warn", { ...options }]`. */
export function settingOf(config: Config, code: string): RuleSetting {
  const raw = config.lint?.rules?.[code];
  const [level, options] = Array.isArray(raw) ? raw : [raw];
  return {
    level: level === "off" || level === "warn" || level === "error" ? level : undefined,
    options: (options as Record<string, unknown> | undefined) ?? {},
  };
}

/** What the rules know about a Dialex project. */
export interface ProjectIndex {
  root: string;
  config: Config;
  /** Dictionaries read from dictionary files, by name. */
  dictionaries: ReadonlyMap<string, AnalyzedDictionary>;
  /** Dictionaries registered in code with `dictionaries: { name: ... }`. */
  inline: ReadonlySet<string>;
  result: AnalysisResult;
}

interface Entry {
  index: ProjectIndex;
  checkedAt: number;
}

/** A long-lived linter process re-reads the project at most this often. */
const REFRESH_MS = 1000;

const cache: AnalysisCache = createAnalysisCache();
const entries = new Map<string, Entry>();
const roots = new Map<string, string | null>();

/** The nearest directory above `dir` that has a `dialex.config.*`, or `undefined`. */
export function findRoot(dir: string): string | undefined {
  const known = roots.get(dir);
  if (known !== undefined) return known ?? undefined;

  let found: string | undefined;
  for (let at = dir; ; at = path.dirname(at)) {
    if (readStaticConfig(at).file) {
      found = at;
      break;
    }
    if (path.dirname(at) === at) break;
  }
  roots.set(dir, found ?? null);
  return found;
}

/**
 * The index of the project `filename` belongs to, or `undefined` when no `dialex.config.*` is
 * found above it (the rules then do nothing instead of guessing).
 */
export function projectFor(filename: string): ProjectIndex | undefined {
  const root = findRoot(path.dirname(filename));
  if (!root) return undefined;

  const entry = entries.get(root);
  const now = Date.now();
  if (entry && now - entry.checkedAt < REFRESH_MS) return entry.index;

  const { config } = readStaticConfig(root);
  const result = analyzeProjectSync({ root, config, unused: false, cache });
  const index: ProjectIndex = {
    root,
    config,
    dictionaries: new Map(result.dictionaries.map((d) => [d.name, d])),
    inline: new Set(result.inlineDictionaries),
    result,
  };
  entries.set(root, { index, checkedAt: now });
  return index;
}

/** Issues for one dictionary file, analyzed from its unsaved `text`. */
export function dictionaryIssues(filename: string, text: string) {
  const root = findRoot(path.dirname(filename));
  if (!root) return [];
  const { config } = readStaticConfig(root);
  const { issues } = analyzeProjectSync({
    root,
    config,
    src: [],
    unused: false,
    cache,
    contents: new Map([[filename, text]]),
  });
  return issues.filter((issue) => issue.file === filename);
}

/** Forgets what was read. For tests and for long-lived hosts that know files changed. */
export function resetProjects(): void {
  entries.clear();
  roots.clear();
}
