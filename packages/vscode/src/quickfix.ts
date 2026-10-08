import {
  TODO_PREFIX,
  copyLeaf,
  hasPath,
  listLocales,
  parseDictionaryText,
  renderDictionaryFile,
  setString,
} from "@dialex/cli/api";

export interface MissingKey {
  locale: string;
  path: string[];
  /** A locale that has the key, to copy its value from. */
  sourceLocale?: string;
}

/**
 * New text for a dictionary file with `missing` keys added to their locales, copied from the
 * source locale (strings get the `[TODO] ` marker, like `dialex check --fix`). Returns
 * `undefined` if nothing could be added.
 */
export function addMissingKeys(
  file: string,
  text: string,
  missing: MissingKey[],
): string | undefined {
  const df = parseDictionaryText(file, text);
  if (!df) return undefined;

  let changed = false;
  for (const { locale, path, sourceLocale } of missing) {
    if (!sourceLocale) continue;
    if (copyLeaf(df, sourceLocale, locale, path, (value) => `${TODO_PREFIX}${value}`))
      changed = true;
  }
  return changed ? renderDictionaryFile(df) : undefined;
}

/**
 * New text for a dictionary file with a key that code refers to but the dictionary lacks, added
 * to every locale as a `[TODO]` placeholder named after the key.
 */
export function addUnknownKey(file: string, text: string, keyPath: string[]): string | undefined {
  const df = parseDictionaryText(file, text);
  if (!df) return undefined;

  const placeholder = `${TODO_PREFIX}${keyPath[keyPath.length - 1]}`;
  let changed = false;
  for (const locale of listLocales(df)) {
    if (
      !hasPath(df, locale, keyPath) &&
      setString(df, locale, keyPath, placeholder) !== "skipped"
    ) {
      changed = true;
    }
  }
  return changed ? renderDictionaryFile(df) : undefined;
}
