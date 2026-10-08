import fs from "node:fs";
import path from "node:path";
import { listLeaves, listLocales } from "../utils/dictionary-edit.js";
import { loadProject, toKey } from "../utils/project.js";
import { logger } from "../utils/logger.js";

export type TranslationFormat = "json" | "csv" | "xliff";

export interface ExportOptions {
  cwd?: string;
  config?: string;
  format?: TranslationFormat;
  /** Output directory, relative to `cwd`. */
  out?: string;
  /** Limit the export to these locales. */
  locale?: string[];
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
}

export interface ExportResult {
  success: boolean;
  files: string[];
  keys: number;
  /** Function values cannot be exported as plain text. */
  skippedFunctions: number;
  skippedFiles: string[];
}

export const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const csvCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export async function runExport(options: ExportOptions = {}): Promise<ExportResult> {
  const root = options.cwd || process.cwd();
  const format = options.format || "json";
  if (!["json", "csv", "xliff"].includes(format)) {
    throw new Error(`Unsupported format "${format}". Use json, csv, or xliff.`);
  }
  const outDir = path.resolve(root, options.out || "i18n-export");

  const project = await loadProject(root, options.config);
  const defaultLocale = project.config.defaultLocale || "en";

  // locale -> key -> value (insertion order = source order)
  const table = new Map<string, Map<string, string>>();
  const orderedKeys = new Set<string>();
  let skippedFunctions = 0;

  const localeSet = new Set<string>(project.config.locales || []);
  for (const { df } of project.dictionaries) listLocales(df).forEach((l) => localeSet.add(l));
  let locales = Array.from(localeSet);
  if (options.locale && options.locale.length > 0) {
    locales = locales.filter((l) => options.locale!.includes(l) || l === defaultLocale);
  }
  for (const locale of locales) table.set(locale, new Map());

  for (const { name, df } of project.dictionaries) {
    for (const locale of listLocales(df)) {
      if (!table.has(locale)) continue;
      for (const leaf of listLeaves(df, locale)) {
        if (leaf.kind === "string" && leaf.value !== undefined) {
          const key = toKey(name, leaf.path);
          table.get(locale)!.set(key, leaf.value);
          orderedKeys.add(key);
        } else if (locale === defaultLocale) {
          skippedFunctions++;
        }
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  const write = (name: string, content: string) => {
    const file = path.join(outDir, name);
    fs.writeFileSync(file, content, "utf-8");
    files.push(path.relative(root, file));
  };

  if (format === "json") {
    for (const [locale, values] of table) {
      write(`${locale}.json`, JSON.stringify(Object.fromEntries(values), null, 2) + "\n");
    }
  } else if (format === "csv") {
    const header = ["key", ...table.keys()].map(csvCell).join(",");
    const rows = [...orderedKeys].map((key) =>
      [key, ...[...table.values()].map((v) => v.get(key) ?? "")].map(csvCell).join(","),
    );
    write("translations.csv", [header, ...rows].join("\n") + "\n");
  } else {
    const source = table.get(defaultLocale);
    for (const [locale, values] of table) {
      if (locale === defaultLocale) continue;
      const units = [...orderedKeys].map((key) => {
        const src = source?.get(key) ?? "";
        const target = values.get(key);
        const targetXml = target === undefined ? "" : `<target>${escapeXml(target)}</target>`;
        return `      <trans-unit id="${escapeXml(key)}"><source>${escapeXml(src)}</source>${targetXml}</trans-unit>`;
      });
      write(
        `${locale}.xlf`,
        `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="dialex" source-language="${escapeXml(defaultLocale)}" target-language="${escapeXml(locale)}" datatype="plaintext">
    <body>
${units.join("\n")}
    </body>
  </file>
</xliff>
`,
      );
    }
  }

  const quiet = options.json === true;

  const result: ExportResult = {
    success: true,
    files,
    keys: orderedKeys.size,
    skippedFunctions,
    skippedFiles: project.unsupported,
  };

  if (quiet) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.success(
      `Exported ${orderedKeys.size} key${orderedKeys.size === 1 ? "" : "s"} to ${files.length} ${format} file${files.length === 1 ? "" : "s"} in ${path.relative(root, outDir) || "."}`,
    );
    if (skippedFunctions > 0) {
      logger.warn(
        `${skippedFunctions} function value${skippedFunctions === 1 ? "" : "s"} skipped (not translatable as text)`,
      );
    }
    for (const file of project.unsupported)
      logger.warn(`Skipped ${file}: unsupported dictionary shape`);
  }

  return result;
}
