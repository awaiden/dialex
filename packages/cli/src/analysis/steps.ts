import fs from "node:fs";

import { TODO_PREFIX, dictionaryLocation, locationOf } from "../utils/dictionary/index.js";
import { createGitignoreFilter, scanFiles } from "../utils/files.js";
import { checkIcu, type LocaleStrings } from "../utils/icu-check.js";
import { isStale, readLock } from "../utils/lockfile.js";
import { stampOf } from "./cache.js";
import { DEFAULT_SOURCE_GLOB, scanSource } from "./source-scan.js";
import type {
  AnalysisIssue,
  AnalysisOptions,
  AnalysisResult,
  AnalyzedDictionary,
  LintLevel,
  LintSetting,
  LoadRequest,
  Loaded,
  SourceScan,
} from "./types.js";

function lintLevel(setting: LintSetting | undefined): LintLevel | undefined {
  const level = Array.isArray(setting) ? setting[0] : setting;
  return level === "off" || level === "warn" || level === "error" ? level : undefined;
}

/**
 * The analysis itself, written once. It yields a `LoadRequest` for every dictionary so that a
 * synchronous driver (`analyzeProjectSync`) and an asynchronous one (`analyzeProject`, which may
 * import dictionaries at runtime) can share it.
 */
export function* analysisSteps(
  options: AnalysisOptions,
): Generator<LoadRequest, AnalysisResult, Loaded> {
  const { root, config } = options;
  const include = config.include || "**/*.content.ts";
  const configuredLocales = config.locales || [];
  const defaultLocale = config.defaultLocale || "en";
  const extraIgnore = options.ignore ?? [];

  const cache = options.runtime ? undefined : options.cache;
  let gitignore = cache?.gitignore.get(root);
  if (cache && !gitignore) {
    gitignore = createGitignoreFilter(root);
    cache.gitignore.set(root, gitignore);
  }

  const files = scanFiles(root, include, {
    exclude: config.exclude,
    ignore: extraIgnore,
    gitignoreFilter: gitignore,
  });

  const issues: AnalysisIssue[] = [];
  const dictionaries: AnalyzedDictionary[] = [];
  const lock = options.lock === false ? undefined : readLock(root);

  // 1. Dictionaries: parity, placeholders, ICU
  for (const file of files) {
    const loaded: Loaded = yield {
      file,
      runtime: options.runtime === true,
      cache,
      text: options.contents?.get(file),
    };
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
      : scanFiles(root, sourceGlobs, {
          kind: "source",
          exclude: config.exclude,
          ignore: extraIgnore,
          gitignoreFilter: gitignore,
        }).filter((f) => !dictionaryFiles.has(f));

  const inline = new Set<string>();
  if (sourceFiles.length > 0) {
    const tokens = new Set<string>();
    const scans: { file: string; scan: SourceScan }[] = [];

    for (const file of sourceFiles) {
      const stamp = cache ? stampOf(file) : undefined;
      let scan = stamp ? cache!.sources.get(file) : undefined;
      if (!scan || scan.stamp !== stamp) {
        let text: string;
        try {
          text = fs.readFileSync(file, "utf-8");
        } catch {
          continue;
        }
        scan = { stamp: stamp ?? "", scan: scanSource(text) };
        if (cache && stamp) cache.sources.set(file, scan);
      }
      for (const token of scan.scan.tokens) tokens.add(token);
      scans.push({ file, scan: scan.scan });
    }

    // Dictionaries registered in code are known project-wide, wherever they are read
    for (const { scan } of scans) for (const name of scan.inline) inline.add(name);

    for (const { file, scan } of scans) {
      for (const { ref, range } of scan.refs) {
        if (ref.kind === "dictionary") {
          if (!known.has(ref.value) && !inline.has(ref.value)) {
            issues.push({
              file,
              level: "error",
              code: "unknown-dictionary",
              message: `Unknown dictionary "${ref.value}"`,
              range,
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
            range,
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

  if (cache) {
    const live = new Set([...files, ...sourceFiles]);
    for (const map of [cache.dictionaries, cache.sources] as Map<string, unknown>[]) {
      for (const key of map.keys()) if (key.startsWith(root) && !live.has(key)) map.delete(key);
    }
  }

  const rules = config.lint?.rules;
  if (rules && Object.keys(rules).length > 0) {
    for (let i = issues.length - 1; i >= 0; i--) {
      const level = lintLevel(rules[issues[i].code]);
      if (!level) continue;
      if (level === "off") issues.splice(i, 1);
      else issues[i].level = level === "error" ? "error" : "warning";
    }
  }

  return {
    issues,
    dictionaries,
    files,
    sourceFilesScanned: sourceFiles.length,
    inlineDictionaries: [...inline],
  };
}
