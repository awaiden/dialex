import { globalDictionaries, type DictionaryDefinition, type Locales } from "./index.js";
import {
  lookupLocale,
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  extractCookieLocale,
  extractPathLocale,
  type LocaleResolverOptions,
} from "./resolver.js";

export type DictionaryInput =
  | Record<string, Record<string, any>>
  | (DictionaryDefinition<any, any> | Record<string, any>)[];

export interface BaseAdapterOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
   * If omitted, falls back to the dictionaries registered by the project scan.
   */
  dictionaries?: DictionaryInput;
  /**
   * Whether to attach the detected locale to the response `Content-Language` header.
   * @default true
   */
  setHeader?: boolean;
}

/**
 * Normalizes dictionary inputs (array of defineDictionary or dictionary map).
 */
export function normalizeDictionaries(
  input?: DictionaryInput,
): Record<string, Record<string, any>> | undefined {
  if (!input) return undefined;
  if (!Array.isArray(input)) return input;

  const result: Record<string, Record<string, any>> = {};
  for (const item of input) {
    if (item && typeof item === "object" && "name" in item && "dictionary" in item) {
      result[item.name as string] = item.dictionary as Record<string, any>;
    }
  }
  return result;
}

/**
 * Creates a `getDictionary(name)` bound to a resolved locale.
 */
export function createGetDictionary(params: {
  customDictMap?: Record<string, Record<string, any>>;
  locale: string;
  defaultLocale: string;
  fallbacks?: Record<string, string[]>;
  tag: string;
}): <T = any>(name: string) => T {
  const { customDictMap, locale, defaultLocale, fallbacks, tag } = params;
  return <T = any>(name: string): T => {
    const dict = customDictMap?.[name] || globalDictionaries[name];
    if (!dict) {
      console.warn(`[dialex/${tag}] Dictionary "${name}" not found.`);
      return {} as T;
    }
    const found = lookupLocale(dict, locale || defaultLocale, { fallbacks, defaultLocale });
    if (!found) return {} as T;
    if (found.locale !== (locale || defaultLocale)) {
      console.warn(
        `[dialex/${tag}] Locale "${locale}" not found in dictionary "${name}", using "${found.locale}".`,
      );
    }
    return found.content as T;
  };
}

export interface RequestParts {
  /** Result of the user-supplied `custom` extractor, if any. */
  custom?: string | null;
  /** URL pathname (query string and fragment are ignored). */
  pathname?: string | null;
  /** Reads a query parameter by key. */
  query?: (key: string) => string | null | undefined;
  /** Raw `Cookie` header. */
  cookieHeader?: string | null;
  /** Raw `Accept-Language` header value. */
  acceptLanguage?: string | null;
}

/**
 * Collects locale candidates from request parts in the standard order
 * (custom, path, query, cookie, Accept-Language) and resolves the final locale.
 */
export function resolveRequestLocale(options: LocaleResolverOptions, parts: RequestParts): Locales {
  const {
    defaultLocale = "en",
    locales,
    queryKeys = ["locale", "lang"],
    cookieKeys = ["locale", "lang"],
    usePath = true,
  } = options;

  const candidates: (string | null | undefined)[] = [];

  if (parts.custom) candidates.push(parts.custom);

  if (usePath && parts.pathname) {
    candidates.push(extractPathLocale(parts.pathname, locales));
  }

  if (parts.query) {
    for (const key of Array.isArray(queryKeys) ? queryKeys : [queryKeys]) {
      candidates.push(parts.query(key));
    }
  }

  if (parts.cookieHeader) {
    candidates.push(extractCookieLocale(parts.cookieHeader, cookieKeys));
  }

  if (parts.acceptLanguage) {
    candidates.push(...parseAcceptLanguage(parts.acceptLanguage));
  }

  return resolveLocaleFromCandidates(candidates, locales, defaultLocale) as Locales;
}
