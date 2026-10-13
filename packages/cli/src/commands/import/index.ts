import fs from "node:fs";
import path from "node:path";

import {
  getString,
  hasPath,
  listLocales,
  saveDictionaryFile,
  setString,
} from "../../utils/dictionary/index.js";
import { lockFor, readLock, record, writeLock } from "../../utils/lockfile.js";
import { logger } from "../../utils/logger.js";
import { loadProject } from "../../utils/project.js";
import { inferFormat, parseEntries } from "./formats.js";
import { icuProblem } from "./icu-guard.js";
import type { ImportOptions, ImportResult } from "./types.js";

export type { ImportEntry, ImportOptions, ImportResult } from "./types.js";
export { parseCsv, parseEntries } from "./formats.js";

export async function runImport(options: ImportOptions): Promise<ImportResult> {
  const root = options.cwd || process.cwd();
  const file = path.resolve(root, options.file);
  const format = options.format || inferFormat(file);
  const fallbackLocale = options.locale ?? path.basename(file, path.extname(file));

  const entries = parseEntries(
    fs.readFileSync(file, "utf-8"),
    format,
    options.locale ?? fallbackLocale,
  );
  const project = await loadProject(root, options.config);
  const byName = new Map(project.dictionaries.map((d) => [d.name, d]));

  const quiet = options.json === true;
  const result: ImportResult = {
    success: true,
    created: 0,
    updated: 0,
    skipped: [],
    rejected: [],
    unknown: [],
    errors: [],
  };
  const touched = new Set<string>();

  // With a lock file, imported translations are recorded against the current source text.
  const lockInUse = readLock(root) !== undefined;
  const sourceLocale = readLock(root)?.sourceLocale ?? project.config.defaultLocale ?? "en";
  const { lock } = lockFor(root, sourceLocale);
  let recorded = 0;

  for (const { locale, key, value } of entries) {
    const [name, ...keyPath] = key.split(".");
    const dict = byName.get(name);
    if (!dict || keyPath.length === 0) {
      result.unknown.push(key);
      continue;
    }

    const exists = listLocales(dict.df).some((l) => hasPath(dict.df, l, keyPath));
    if (!exists && !options.allowNew) {
      result.unknown.push(key);
      continue;
    }

    const problem = icuProblem(
      dict.df,
      project.config.defaultLocale ?? "en",
      locale,
      keyPath,
      value,
    );
    if (problem) {
      result.rejected.push(`${locale}:${key} (${problem})`);
      continue;
    }

    const outcome = setString(dict.df, locale, keyPath, value);
    if (outcome === "skipped") {
      result.skipped.push(`${locale}:${key}`);
    } else {
      result[outcome]++;
      touched.add(dict.rel);
      const sourceText = getString(dict.df, sourceLocale, keyPath);
      if (lockInUse && locale !== sourceLocale && sourceText !== undefined) {
        record(lock, locale, key, sourceText);
        recorded++;
      }
    }
  }
  if (recorded > 0) writeLock(root, lock);

  for (const dict of project.dictionaries) {
    if (touched.has(dict.rel)) await saveDictionaryFile(dict.df);
  }

  if (result.rejected.length > 0) {
    result.success = false;
  }

  if (quiet) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.success(
      `Imported ${result.created + result.updated} value${result.created + result.updated === 1 ? "" : "s"} (${result.created} added, ${result.updated} updated)`,
    );
    if (result.unknown.length > 0) {
      logger.warn(
        `${result.unknown.length} unknown key${result.unknown.length === 1 ? "" : "s"} ignored (use --allow-new to add): ${result.unknown.slice(0, 5).join(", ")}${result.unknown.length > 5 ? ", ..." : ""}`,
      );
    }
    if (result.rejected.length > 0) {
      logger.warn(
        `${result.rejected.length} value${result.rejected.length === 1 ? "" : "s"} rejected: ${result.rejected.slice(0, 5).join("; ")}`,
      );
    }
    if (result.skipped.length > 0) {
      logger.warn(
        `${result.skipped.length} non-text value${result.skipped.length === 1 ? "" : "s"} left unchanged: ${result.skipped.slice(0, 5).join(", ")}`,
      );
    }
  }

  return result;
}
