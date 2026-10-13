import {
  TODO_PREFIX,
  copyLeaf,
  hasPath,
  listLeaves,
  listLocales,
  loadDictionaryFile,
  saveDictionaryFile,
} from "../../utils/dictionary/index.js";

/**
 * Inserts keys that exist in one locale but not in another, copying the default-locale value
 * (strings get a `[TODO]` prefix). Returns how many keys were inserted.
 */
export async function applyFixes(
  files: string[],
  configuredLocales: string[],
  defaultLocale: string,
): Promise<number> {
  let fixed = 0;

  for (const file of files) {
    const df = await loadDictionaryFile(file);
    // Spreads and computed keys hide keys from the syntax tree; inserting would be guesswork.
    if (!df?.complete) continue;

    const present = listLocales(df);
    const targets = Array.from(new Set([...present, ...configuredLocales]));
    const sourceOrder = [defaultLocale, ...present.filter((l) => l !== defaultLocale)].filter((l) =>
      present.includes(l),
    );

    const allPaths = new Map<string, string[]>();
    for (const locale of present) {
      for (const leaf of listLeaves(df, locale)) allPaths.set(leaf.path.join("\u0000"), leaf.path);
    }

    let changed = false;
    for (const target of targets) {
      for (const leafPath of allPaths.values()) {
        if (hasPath(df, target, leafPath)) continue;
        const source = sourceOrder.find((l) => l !== target && hasPath(df, l, leafPath));
        if (source && copyLeaf(df, source, target, leafPath, (v) => `${TODO_PREFIX}${v}`)) {
          fixed++;
          changed = true;
        }
      }
    }

    if (changed) await saveDictionaryFile(df);
  }

  return fixed;
}
