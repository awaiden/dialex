import { getArguments, isIcuStructured, parseMessage } from "dialex/icu";

/** `{name}`, `%s` / `%1$d`, and HTML/XML tags: text that must survive translation unchanged. */
const PLACEHOLDER = /\{[^{}]+\}|%\d*\$?[sdif]|<\/?[A-Za-z][^<>]*>/g;

export function extractPlaceholders(text: string): string[] {
  return text.match(PLACEHOLDER) ?? [];
}

/**
 * ICU plural/select messages put translatable text inside `{...}` branches, so brace matching
 * is meaningless for them. Compare the structure instead: the same arguments with the same
 * types, every `select` key and every exact `=N` plural match preserved. A translation may
 * add or drop plural categories (`one`, `few`, ...), because languages need different ones.
 */
function preservesIcuStructure(source: string, translated: string): boolean {
  try {
    const before = getArguments(parseMessage(source));
    const after = getArguments(parseMessage(translated));
    const sameArguments =
      before.length === after.length &&
      before.every((a) => after.some((b) => a.name === b.name && a.type === b.type));
    if (!sameArguments) return false;

    return before.every((a) => {
      const other = after.find((b) => b.name === a.name && b.type === a.type)!;
      const keep =
        a.type === "select"
          ? (a.selectors ?? [])
          : (a.selectors ?? []).filter((selector) => selector.startsWith("="));
      return keep.every((selector) => other.selectors?.includes(selector));
    });
  } catch {
    return false;
  }
}

/** True when every placeholder of `source` appears in `translated` (as many times as in the source). */
export function preservesPlaceholders(source: string, translated: string): boolean {
  if (isIcuStructured(source)) return preservesIcuStructure(source, translated);

  const remaining = extractPlaceholders(translated);
  for (const placeholder of extractPlaceholders(source)) {
    const index = remaining.indexOf(placeholder);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
}
