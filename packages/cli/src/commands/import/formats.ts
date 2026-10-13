import path from "node:path";

import type { TranslationFormat } from "../export.js";
import type { ImportEntry } from "./types.js";

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

export function inferFormat(file: string): TranslationFormat {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".json") return "json";
  if (ext === ".csv") return "csv";
  if (ext === ".xlf" || ext === ".xliff") return "xliff";
  throw new Error(`Cannot infer format from "${ext}". Pass --format json|csv|xliff.`);
}
