import fs from "node:fs";
import { pathToFileURL } from "node:url";

import {
  flattenPaths,
  listLeaves,
  listLocales,
  parseDictionaryText,
  type DictionaryFile,
} from "../utils/dictionary/index.js";
import { stampOf } from "./cache.js";
import type { AnalysisCache, DictionaryData, LeafInfo, Loaded } from "./types.js";

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

export function fromParsed(parsed: () => DictionaryFile | undefined): Loaded | undefined {
  try {
    const df = parsed();
    if (df?.complete && df.name) return { ok: true, data: fromSyntaxTree(df) };
  } catch (error) {
    return {
      ok: false,
      level: "error",
      code: "invalid-dictionary",
      message: `Failed to parse dictionary: ${(error as Error).message}`,
    };
  }
  return undefined;
}

export const UNANALYZABLE: Loaded = {
  ok: false,
  level: "info",
  code: "unanalyzable",
  message:
    "This dictionary uses spreads, computed keys, imported values, or a computed name, so it cannot be analyzed statically.",
};

/** Reads a dictionary from its syntax tree. Never runs project code. */
function loadDictionaryDataStatic(file: string): Loaded {
  return (
    fromParsed(() => parseDictionaryText(file, fs.readFileSync(file, "utf-8"))) ?? UNANALYZABLE
  );
}

async function loadDictionaryData(file: string, runtime: boolean): Promise<Loaded> {
  const parsed = fromParsed(() => parseDictionaryText(file, fs.readFileSync(file, "utf-8")));
  if (parsed?.ok) return parsed;
  if (runtime) return fromRuntime(file);
  return parsed ?? UNANALYZABLE;
}

export async function cachedDictionary(
  file: string,
  runtime: boolean,
  cache: AnalysisCache | undefined,
): Promise<Loaded> {
  const stamp = cache ? stampOf(file) : undefined;
  const hit = stamp ? cache!.dictionaries.get(file) : undefined;
  if (hit && hit.stamp === stamp) return hit.loaded;

  const loaded = await loadDictionaryData(file, runtime);
  if (cache && stamp) cache.dictionaries.set(file, { stamp, loaded });
  return loaded;
}

export function cachedDictionaryStatic(file: string, cache: AnalysisCache | undefined): Loaded {
  const stamp = cache ? stampOf(file) : undefined;
  const hit = stamp ? cache!.dictionaries.get(file) : undefined;
  if (hit && hit.stamp === stamp) return hit.loaded;

  const loaded = loadDictionaryDataStatic(file);
  if (cache && stamp) cache.dictionaries.set(file, { stamp, loaded });
  return loaded;
}
