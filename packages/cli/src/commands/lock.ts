import path from "node:path";
import pc from "picocolors";
import { TODO_PREFIX, listLeaves, listLocales } from "../utils/dictionary-edit.js";
import { LOCK_FILE, isStale, lockFor, lockPath, record, writeLock } from "../utils/lockfile.js";
import { loadProject, toKey } from "../utils/project.js";
import { logger } from "../utils/logger.js";
import fs from "node:fs";

export interface LockOptions {
  cwd?: string;
  config?: string;
  /** Locale the translations were made from. Defaults to `translate.sourceLocale`, then `defaultLocale`. */
  source?: string;
  /** Also accept translations that are out of date (say they are fine as they are). */
  all?: boolean;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
}

export interface LockResult {
  success: boolean;
  sourceLocale: string;
  /** Translations newly recorded as up to date. */
  recorded: number;
  /** Keys that are still out of date (only without `--all`). */
  stale: string[];
}

/**
 * Records the current translations as up to date with the current source text, so later edits to
 * the source can be noticed. Translations that are already out of date are left alone unless
 * `--all` is given. Run it once when you adopt the lock file, and after reviewing stale ones.
 */
export async function runLock(options: LockOptions = {}): Promise<LockResult> {
  const root = options.cwd || process.cwd();
  const project = await loadProject(root, options.config);
  const source =
    options.source ??
    project.config.translate?.sourceLocale ??
    project.config.defaultLocale ??
    "en";
  const { lock } = lockFor(root, source);

  const result: LockResult = { success: true, sourceLocale: source, recorded: 0, stale: [] };

  for (const dict of project.dictionaries) {
    const sourceText = new Map(
      listLeaves(dict.df, source)
        .filter((leaf) => leaf.kind === "string" && leaf.value !== undefined)
        .map((leaf) => [leaf.path.join("."), leaf.value!]),
    );

    for (const locale of listLocales(dict.df)) {
      if (locale === source) continue;
      for (const leaf of listLeaves(dict.df, locale)) {
        if (leaf.kind !== "string" || leaf.value === undefined) continue;
        if (leaf.value.startsWith(TODO_PREFIX)) continue; // not translated yet
        const text = sourceText.get(leaf.path.join("."));
        if (text === undefined) continue;

        const key = toKey(dict.name, leaf.path);
        const known = lock.locales[locale]?.[key] !== undefined;
        if (known && isStale(lock, locale, key, text)) {
          if (!options.all) {
            result.stale.push(`${locale}:${key}`);
            continue;
          }
        } else if (known) {
          continue; // already recorded and current
        }
        record(lock, locale, key, text);
        result.recorded++;
      }
    }
  }

  if (result.recorded > 0 || !fs.existsSync(lockPath(root))) writeLock(root, lock);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.success(
      `Recorded ${result.recorded} translation${result.recorded === 1 ? "" : "s"} in ${path.basename(LOCK_FILE)} (source "${source}")`,
    );
    if (result.stale.length > 0) {
      logger.warn(
        `${result.stale.length} out of date and left as they are: ${result.stale.slice(0, 5).join(", ")}${result.stale.length > 5 ? ", ..." : ""}`,
      );
      logger.log(
        `  ${pc.dim("Re-translate them with")} dialex translate --stale${pc.dim(", or accept them with")} dialex lock --all`,
      );
    }
  }
  return result;
}
