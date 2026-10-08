import {
  argumentSignature,
  findPlurals,
  getArguments,
  isIcuStructured,
  parseMessage,
  type IcuNode,
} from "dialex/icu";

export interface IcuFinding {
  level: "error" | "warning";
  code: "invalid-icu" | "icu-args-mismatch" | "icu-plural-categories";
  locale: string;
  /** Dotted key including the dictionary name, e.g. `cart.items`. */
  key: string;
  message: string;
}

/** `locale -> dotted path within the dictionary -> string value` */
export type LocaleStrings = Map<string, Map<string, string>>;

function requiredCategories(locale: string, ordinal: boolean): string[] {
  try {
    return new Intl.PluralRules(locale, { type: ordinal ? "ordinal" : "cardinal" })
      .resolvedOptions()
      .pluralCategories.filter((c) => c !== "other");
  } catch {
    return []; // not a valid BCP 47 tag; nothing to compare against
  }
}

/**
 * Validates ICU messages across the locales of one dictionary:
 *
 * - invalid syntax: an error for messages that clearly use ICU (plural/select/number/date/time),
 *   a warning for plain `{placeholders}` that do not parse (they may not be meant as ICU);
 * - every locale must use the same arguments as the reference locale;
 * - plural options should cover the categories the locale's plural rules need.
 */
export function checkIcu(
  dictionary: string,
  strings: LocaleStrings,
  defaultLocale: string,
): IcuFinding[] {
  const findings: IcuFinding[] = [];
  const parsed = new Map<string, Map<string, IcuNode[]>>();

  for (const [locale, entries] of strings) {
    const ok = new Map<string, IcuNode[]>();
    for (const [path, value] of entries) {
      if (!value.includes("{")) continue;
      const key = `${dictionary}.${path}`;
      try {
        ok.set(path, parseMessage(value));
      } catch (error) {
        const structured = isIcuStructured(value);
        findings.push({
          level: structured ? "error" : "warning",
          code: "invalid-icu",
          locale,
          key,
          message: structured
            ? `Invalid ICU message "${key}" (${locale}): ${(error as Error).message}`
            : `"${key}" (${locale}) contains braces but is not valid ICU, so t() values cannot be applied: ${(error as Error).message}`,
        });
      }
    }
    parsed.set(locale, ok);
  }

  // Compare every locale against the reference (default locale first)
  const order = [defaultLocale, ...[...parsed.keys()].filter((l) => l !== defaultLocale)];
  const paths = new Set([...parsed.values()].flatMap((m) => [...m.keys()]));

  for (const path of paths) {
    const key = `${dictionary}.${path}`;
    const reference = order.find((l) => parsed.get(l)?.has(path));
    if (!reference) continue;
    const expected = argumentSignature(parsed.get(reference)!.get(path)!);

    for (const locale of order) {
      const nodes = parsed.get(locale)?.get(path);
      if (nodes && locale !== reference) {
        const found = argumentSignature(nodes);
        if (found !== expected) {
          findings.push({
            level: "error",
            code: "icu-args-mismatch",
            locale,
            key,
            message: `Locale "${locale}" uses different arguments than "${reference}" for "${key}" (expected ${expected || "none"}, found ${found || "none"})`,
          });
        }
      }
      if (!nodes) continue;

      for (const plural of findPlurals(nodes)) {
        const missing = requiredCategories(locale, plural.ordinal).filter(
          (c) => !(c in plural.options),
        );
        if (missing.length > 0) {
          findings.push({
            level: "warning",
            code: "icu-plural-categories",
            locale,
            key,
            message: `Locale "${locale}" plural "${plural.name}" in "${key}" has no ${missing.map((c) => `"${c}"`).join(", ")} option (used by this language; "other" will be shown instead)`,
          });
        }
      }
    }
  }

  return findings;
}

/** Arguments of a message, or `undefined` when it does not parse. */
export function tryGetArguments(message: string) {
  try {
    return getArguments(parseMessage(message));
  } catch {
    return undefined;
  }
}
