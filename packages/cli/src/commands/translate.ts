import type { TranslateProvider } from "dialexjs";
import { isIcuStructured } from "dialexjs/icu";
import pc from "picocolors";

import { preservesPlaceholders } from "../translate/placeholders.js";
import {
  TODO_PREFIX,
  listLeaves,
  listLocales,
  saveDictionaryFile,
  setString,
} from "../utils/dictionary-edit.js";
import { isStale, lockFor, record, writeLock } from "../utils/lockfile.js";
import { logger } from "../utils/logger.js";
import { loadProject, toKey, type ProjectDictionary } from "../utils/project.js";

export interface TranslateOptions {
  cwd?: string;
  config?: string;
  /** Target locales. Defaults to every configured locale except the source. */
  locale?: string[];
  /** Locale to translate from. Defaults to `translate.sourceLocale`, then `defaultLocale`. */
  source?: string;
  /** List what would be translated without calling the provider or writing files. */
  dryRun?: boolean;
  /** Overrides the provider from the config (used by tests). */
  provider?: TranslateProvider;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
  /**
   * Also re-translate strings whose source text changed since they were translated, according to
   * `dialex.lock.json`. Only these strings may replace an existing translation.
   */
  stale?: boolean;
}

export interface PendingTranslation {
  file: string;
  locale: string;
  key: string;
  source: string;
  /** The translation existed but its source text has changed since. */
  stale?: boolean;
  /** Present after translation. */
  translated?: string;
}

export interface TranslateResult {
  success: boolean;
  dryRun: boolean;
  pending: PendingTranslation[];
  translated: number;
  /** Translations rejected because they changed placeholders, or that could not be written. */
  rejected: string[];
}

interface Task extends PendingTranslation {
  dict: ProjectDictionary;
  path: string[];
}

export async function runTranslate(options: TranslateOptions = {}): Promise<TranslateResult> {
  const root = options.cwd || process.cwd();
  const project = await loadProject(root, options.config);
  const settings = project.config.translate;
  const provider = options.provider ?? settings?.provider;

  if (!provider && !options.dryRun) {
    throw new Error(
      "No translate provider configured. Add `translate: { provider: claudeProvider() }` to dialex.config.ts " +
        '(import it from "@dialexjs/cli/translate").',
    );
  }

  const source = options.source ?? settings?.sourceLocale ?? project.config.defaultLocale ?? "en";
  const everyLocale = new Set<string>(project.config.locales ?? []);
  for (const { df } of project.dictionaries) listLocales(df).forEach((l) => everyLocale.add(l));
  const targets = (options.locale?.length ? options.locale : [...everyLocale]).filter(
    (l) => l !== source,
  );

  const { lock, replaced } = lockFor(root, source);
  if (replaced && !options.json) {
    logger.warn(
      `dialex.lock.json was recorded from another source locale; starting a new one from "${source}".`,
    );
  }

  // 1. Collect strings that are missing or still marked [TODO] (and, with --stale, out of date)
  const tasks: Task[] = [];
  for (const dict of project.dictionaries) {
    const sourceLeaves = listLeaves(dict.df, source).filter(
      (leaf) => leaf.kind === "string" && leaf.value !== undefined,
    );

    for (const locale of targets) {
      const existing = new Map(
        listLeaves(dict.df, locale).map((leaf) => [leaf.path.join("\u0000"), leaf]),
      );
      for (const leaf of sourceLeaves) {
        const current = existing.get(leaf.path.join("\u0000"));
        const key = toKey(dict.name, leaf.path);
        const placeholder =
          !current || (current.kind === "string" && current.value?.startsWith(TODO_PREFIX));
        const stale =
          !placeholder &&
          options.stale === true &&
          current?.kind === "string" &&
          isStale(lock, locale, key, leaf.value!);
        if (placeholder || stale) {
          tasks.push({
            dict,
            path: leaf.path,
            file: dict.rel,
            locale,
            key,
            source: leaf.value!,
            ...(stale ? { stale: true } : {}),
          });
        }
      }
    }
  }

  const quiet = options.json === true;

  const result: TranslateResult = {
    success: true,
    dryRun: options.dryRun === true,
    pending: tasks,
    translated: 0,
    rejected: [],
  };

  if (tasks.length === 0) {
    if (quiet) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      logger.success(`Nothing to translate from "${source}".`);
    }
    return result;
  }

  if (options.dryRun) {
    if (quiet) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      logger.info(
        `Would translate ${tasks.length} string${tasks.length === 1 ? "" : "s"} from "${source}":`,
      );
      for (const t of tasks) {
        logger.log(
          `  ${pc.dim(t.locale)} ${t.key}  ${pc.dim(JSON.stringify(t.source))}${t.stale ? pc.yellow("  (out of date)") : ""}`,
        );
      }
    }
    return result;
  }

  // 2. Translate per target locale, de-duplicating identical source strings
  const touched = new Set<ProjectDictionary>();
  for (const locale of targets) {
    const localeTasks = tasks.filter((t) => t.locale === locale);
    if (localeTasks.length === 0) continue;

    // Providers that cannot keep ICU plural/select structure intact never see those messages
    const sendable = provider!.supportsIcu
      ? localeTasks
      : localeTasks.filter((task) => {
          if (!isIcuStructured(task.source)) return true;
          result.rejected.push(
            `${locale}:${task.key} (provider does not support ICU plural/select messages)`,
          );
          return false;
        });
    if (sendable.length === 0) continue;

    const unique = [...new Set(sendable.map((t) => t.source))];
    if (!quiet) {
      logger.info(
        `Translating ${unique.length} string${unique.length === 1 ? "" : "s"} to "${locale}" with ${provider!.name ?? "provider"}...`,
      );
    }
    const translations = await provider!.translate(unique, source, locale);
    if (translations.length !== unique.length) {
      throw new Error(
        `Provider returned ${translations.length} translations for ${unique.length} strings.`,
      );
    }
    const byText = new Map(unique.map((text, i) => [text, translations[i]]));

    for (const task of sendable) {
      const translated = byText.get(task.source);
      if (typeof translated !== "string" || translated.trim() === "") {
        result.rejected.push(`${locale}:${task.key} (empty translation)`);
        continue;
      }
      if (!preservesPlaceholders(task.source, translated)) {
        result.rejected.push(`${locale}:${task.key} (placeholders changed)`);
        continue;
      }
      if (setString(task.dict.df, locale, task.path, translated) === "skipped") {
        result.rejected.push(`${locale}:${task.key} (not a text value)`);
        continue;
      }
      task.translated = translated;
      record(lock, locale, task.key, task.source);
      result.translated++;
      touched.add(task.dict);
    }
  }

  for (const dict of touched) await saveDictionaryFile(dict.df);
  if (result.translated > 0) writeLock(root, lock);

  if (result.rejected.length > 0) {
    result.success = false;
  }

  if (quiet) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.success(
      `Translated ${result.translated} of ${tasks.length} string${tasks.length === 1 ? "" : "s"}.`,
    );
    if (result.rejected.length > 0) {
      logger.warn(
        `${result.rejected.length} left unchanged: ${result.rejected.slice(0, 5).join("; ")}${result.rejected.length > 5 ? "; ..." : ""}`,
      );
    }
  }
  return result;
}
