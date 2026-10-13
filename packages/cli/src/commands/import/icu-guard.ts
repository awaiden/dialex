import { argumentSignature, parseMessage } from "dialexjs/icu";

import { getString, listLocales } from "../../utils/dictionary/index.js";

/**
 * Why `value` must not replace the current text, if it is an ICU message that is invalid or uses
 * different arguments than the same key in another locale.
 */
export function icuProblem(
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
