import fs from "node:fs";
import path from "node:path";
import {
  getString,
  hasPath,
  listLocales,
  saveDictionaryFile,
  setString,
} from "../utils/dictionary-edit.js";
import { argumentSignature, parseMessage } from "dialexjs/icu";
import { loadProject } from "../utils/project.js";
import { logger } from "../utils/logger.js";
import { lockFor, readLock, record, writeLock } from "../utils/lockfile.js";
import type { TranslationFormat } from "./export.js";

export interface ImportOptions {
  cwd?: string;
  config?: string;
  /** File to import (`.json`, `.csv`, or `.xlf`/`.xliff`). */
  file: string;
  format?: TranslationFormat;
  /** Locale for single-locale files. Defaults to the file name (`tr.json`) or XLIFF target language. */
  locale?: string;
  /** Allow keys that do not exist in any locale yet. */
  allowNew?: boolean;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
}

export interface ImportEntry {
  locale: string;
  key: string;
  value: string;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  /** Function/non-text values that cannot be overwritten. */
  skipped: string[];
  /** Values refused because they are invalid ICU or change the message arguments. */
  rejected: string[];
  unknown: string[];
  errors: string[];
}

const unescapeXml = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

export function parseEntries(
  content: string,
  format: TranslationFormat,
  fallbackLocale: string | undefined,
): ImportEntry[] {
  const entries: ImportEntry[] = [];

  if (format === "json") {
    const data = JSON.parse(content) as Record<string, unknown>;
    const isNested =
      Object.keys(data).length > 0 &&
      Object.values(data).every((v) => v && typeof v === "object" && !Array.isArray(v));
    if (isNested) {
      for (const [locale, values] of Object.entries(data)) {
        for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
          if (typeof value === "string") entries.push({ locale, key, value });
        }
      }
    } else {
      if (!fallbackLocale) throw new Error("Cannot infer the locale; pass --locale.");
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") entries.push({ locale: fallbackLocale, key, value });
      }
    }
  } else if (format === "csv") {
    const [header, ...rows] = parseCsv(content);
    if (!header || header[0] !== "key") throw new Error('CSV must start with a "key" column.');
    for (const row of rows) {
      header.slice(1).forEach((locale, i) => {
        const value = row[i + 1];
        if (value !== undefined && value !== "") entries.push({ locale, key: row[0], value });
      });
    }
  } else {
    const locale = /target-language="([^"]*)"/.exec(content)?.[1] ?? fallbackLocale;
    if (!locale) throw new Error("Cannot infer the locale; pass --locale.");
    const unit = /<trans-unit\b[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/trans-unit>/g;
    for (const match of content.matchAll(unit)) {
      const target = /<target\b[^>]*>([\s\S]*?)<\/target>/.exec(match[2])?.[1];
      if (target !== undefined && target !== "") {
        entries.push({ locale, key: unescapeXml(match[1]), value: unescapeXml(target) });
      }
    }
  }

  return entries;
}

function inferFormat(file: string): TranslationFormat {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".json") return "json";
  if (ext === ".csv") return "csv";
  if (ext === ".xlf" || ext === ".xliff") return "xliff";
  throw new Error(`Cannot infer format from "${ext}". Pass --format json|csv|xliff.`);
}

/**
 * Why `value` must not replace the current text, if it is an ICU message that is invalid or uses
 * different arguments than the same key in another locale.
 */
function icuProblem(
  df: Parameters<typeof getString>[0],
  defaultLocale: string,
  locale: string,
  keyPath: string[],
  value: string,
): string | undefined {
  if (!value.includes("{")) return undefined;

  let signature: string;
  try {
    signature = argumentSignature(parseMessage(value));
  } catch (error) {
    return `invalid ICU: ${(error as Error).message}`;
  }

  const locales = listLocales(df);
  for (const other of [defaultLocale, ...locales.filter((l) => l !== defaultLocale)]) {
    if (other === locale) continue;
    const reference = getString(df, other, keyPath);
    if (!reference?.includes("{")) continue;
    try {
      const expected = argumentSignature(parseMessage(reference));
      return expected === signature
        ? undefined
        : `arguments differ from "${other}": expected ${expected || "none"}, found ${signature || "none"}`;
    } catch {
      continue;
    }
  }
  return undefined;
}

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
