export interface LocaleResolverOptions {
  /**
   * The default locale to fall back to.
   * @default "en"
   */
  defaultLocale?: string;
  /**
   * List of supported locales.
   */
  locales?: string[];
  /**
   * Query parameter key(s) to check.
   * @default ["locale", "lang"]
   */
  queryKeys?: string | string[];
  /**
   * Cookie key(s) to check.
   * @default ["locale", "lang"]
   */
  cookieKeys?: string | string[];
  /**
   * Header to check for language preference.
   * @default "Accept-Language"
   */
  headerKey?: string;
  /**
   * Whether to check the first path segment of the URL for locale (e.g. /tr/api).
   * @default true
   */
  usePath?: boolean;
  /**
   * Custom extractor function.
   */
  custom?: (req: any) => string | undefined | null;
  /**
   * Explicit fallback chains per locale, e.g. `{ "tr-TR": ["tr"], pt: ["es"] }`.
   * Region subtags are always truncated (`tr-TR` -> `tr`) and `defaultLocale` is tried last.
   */
  fallbacks?: Record<string, string[]>;
}

/**
 * Builds the ordered list of locales to try for `locale`: the locale itself, its explicit
 * fallbacks, its subtag truncations (`tr-TR` -> `tr`), and finally `defaultLocale`.
 */
export function resolveFallbackChain(
  locale: string | null | undefined,
  options: { fallbacks?: Record<string, string[]>; defaultLocale?: string } = {},
): string[] {
  const chain: string[] = [];
  const add = (value: string | undefined) => {
    if (value && !chain.includes(value)) chain.push(value);
  };
  const addWithTruncations = (value: string) => {
    const parts = value.split("-");
    for (let i = parts.length; i > 0; i--) add(parts.slice(0, i).join("-"));
  };

  if (locale) {
    add(locale);
    for (const fb of options.fallbacks?.[locale] ?? []) add(fb);
    addWithTruncations(locale);
    for (const fb of options.fallbacks?.[locale] ?? []) addWithTruncations(fb);
  }
  add(options.defaultLocale);
  return chain;
}

/**
 * Looks up the content for `locale` in a locale-keyed dictionary, walking the fallback chain.
 * Returns the content plus the locale that supplied it, or `undefined` if none matched.
 */
export function lookupLocale<T = any>(
  dictionary: Record<string, T>,
  locale: string | null | undefined,
  options: { fallbacks?: Record<string, string[]>; defaultLocale?: string } = {},
): { content: T; locale: string } | undefined {
  for (const candidate of resolveFallbackChain(locale, options)) {
    if (dictionary[candidate] !== undefined) {
      return { content: dictionary[candidate], locale: candidate };
    }
  }
  const first = Object.keys(dictionary)[0];
  return first !== undefined ? { content: dictionary[first], locale: first } : undefined;
}

/**
 * Parses an Accept-Language header string into a priority-sorted list of locale tags.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header || typeof header !== "string") return [];

  return header
    .split(",")
    .map((part) => {
      const [lang, ...params] = part.trim().split(";");
      let q = 1.0;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q" && value) {
          const parsedQ = parseFloat(value);
          if (!isNaN(parsedQ)) q = parsedQ;
        }
      }
      return { lang: lang.trim(), q };
    })
    .filter((item) => item.lang && item.lang !== "*" && item.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((item) => item.lang);
}

/**
 * Matches a candidate locale tag against a list of supported locales.
 * Supports exact matches and language code prefix matches (e.g. "en-US" matches "en").
 */
export function matchLocale(
  candidate: string | null | undefined,
  supportedLocales: string[],
): string | undefined {
  if (!candidate || typeof candidate !== "string") return undefined;

  const normalizedCandidate = candidate.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = supportedLocales.find((loc) => loc.toLowerCase() === normalizedCandidate);
  if (exact) return exact;

  // 2. Language prefix match (e.g. "en-US" matches "en")
  const candidateBase = normalizedCandidate.split("-")[0];
  const baseMatch = supportedLocales.find((loc) => loc.toLowerCase() === candidateBase);
  if (baseMatch) return baseMatch;

  // 3. Supported locale prefix match (e.g. candidate "en" matches supported "en-US")
  const supportedMatch = supportedLocales.find(
    (loc) => loc.toLowerCase().split("-")[0] === normalizedCandidate,
  );
  if (supportedMatch) return supportedMatch;

  return undefined;
}

/**
 * Resolves a final locale given an ordered list of candidate strings and configuration.
 */
export function resolveLocaleFromCandidates(
  candidates: (string | null | undefined)[],
  supportedLocales?: string[],
  defaultLocale: string = "en",
): string {
  const validCandidates = candidates.filter((c): c is string =>
    Boolean(c && typeof c === "string"),
  );

  if (!supportedLocales || supportedLocales.length === 0) {
    return validCandidates[0] || defaultLocale;
  }

  for (const candidate of validCandidates) {
    const matched = matchLocale(candidate, supportedLocales);
    if (matched) return matched;
  }

  return defaultLocale;
}

/**
 * Parses a cookie header string and extracts candidate locale(s).
 */
export function extractCookieLocale(
  cookieHeader: string | null | undefined,
  keys: string | string[] = ["locale", "lang"],
): string | undefined {
  if (!cookieHeader || typeof cookieHeader !== "string") return undefined;

  const keyList = Array.isArray(keys) ? keys : [keys];
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawVal] = pair.trim().split("=");
    if (rawKey) {
      const rawValue = rawVal.join("=").trim();
      try {
        acc[rawKey.trim()] = decodeURIComponent(rawValue);
      } catch {
        acc[rawKey.trim()] = rawValue;
      }
    }
    return acc;
  }, {});

  for (const key of keyList) {
    if (cookies[key]) return cookies[key];
  }

  return undefined;
}

/**
 * Extracts a candidate locale from the first segment of a URL pathname.
 * E.g. "/tr/dashboard" -> "tr", "/en-US/users" -> "en-US".
 * Query strings and fragments are ignored. Without `supportedLocales` nothing is
 * returned, since any first segment (e.g. "/api") would otherwise look like a locale.
 */
export function extractPathLocale(
  pathname: string | null | undefined,
  supportedLocales?: string[],
): string | undefined {
  if (!pathname || typeof pathname !== "string") return undefined;
  if (!supportedLocales || supportedLocales.length === 0) return undefined;

  const [pathOnly] = pathname.split(/[?#]/, 1);
  const segments = pathOnly.split("/").filter(Boolean);
  if (segments.length === 0) return undefined;

  return matchLocale(segments[0], supportedLocales);
}
