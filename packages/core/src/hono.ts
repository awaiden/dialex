import type { Context, MiddlewareHandler } from "hono";

import type { DictionaryDefinition, Locales } from "./index.js";
import { autoScanAndLoadDictionaries } from "./lazy-scanner.js";
import {
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  extractCookieLocale,
  extractPathLocale,
  type LocaleResolverOptions,
  withConfig,
} from "./resolver.js";
import { createGetDictionary, normalizeDictionaries } from "./shared.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export interface HonoDialexOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
   * If omitted, falls back to the bundled virtual dictionary registry.
   */
  dictionaries?:
    | Record<string, Record<string, any>>
    | (DictionaryDefinition<any, any> | Record<string, any>)[];
  /**
   * Whether to attach the detected locale to the response `Content-Language` header.
   * @default true
   */
  setHeader?: boolean;
}

declare module "hono" {
  interface ContextVariableMap {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Hono middleware for i18n detection and dictionary resolution.
 */
export function dialex(rawOptions: HonoDialexOptions = {}): MiddlewareHandler {
  const options = withConfig(rawOptions);
  const {
    defaultLocale = "en",
    locales,
    queryKeys = ["locale", "lang"],
    cookieKeys = ["locale", "lang"],
    headerKey = "accept-language",
    custom,
    setHeader = true,
    usePath = true,
  } = options;

  const queryKeyList = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
  const customDictMap = normalizeDictionaries(options.dictionaries);

  let scanPromise: Promise<any> | undefined;
  if (!customDictMap) {
    scanPromise = autoScanAndLoadDictionaries(process.cwd(), {
      defaultLocale,
      locales,
    });
  }

  return async (c: Context, next) => {
    if (scanPromise) {
      await scanPromise;
    }

    const candidates: (string | null | undefined)[] = [];

    // 1. Custom extractor
    if (typeof custom === "function") {
      candidates.push(custom(c));
    }

    // 2. URL Path locale (e.g. /tr/api)
    if (usePath && c.req.path) {
      const pVal = extractPathLocale(c.req.path, locales);
      if (pVal) candidates.push(pVal);
    }

    // 2. Query parameters
    for (const qk of queryKeyList) {
      const qVal = c.req.query(qk);
      if (qVal) candidates.push(qVal);
    }

    // 3. Cookie
    const cookieHeader = c.req.header("cookie");
    if (cookieHeader) {
      const cVal = extractCookieLocale(cookieHeader, cookieKeys);
      if (cVal) candidates.push(cVal);
    }

    // 4. Accept-Language header
    const langHeader = c.req.header(headerKey);
    if (langHeader) {
      candidates.push(...parseAcceptLanguage(langHeader));
    }

    // Resolve final locale
    const resolvedLocale = resolveLocaleFromCandidates(
      candidates,
      locales,
      defaultLocale,
    ) as Locales;

    // Attach to context
    c.set("locale", resolvedLocale);

    // Provide scoped getDictionary function
    const getDictionary = createGetDictionary({
      customDictMap,
      locale: resolvedLocale as string,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "hono",
    }) as <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;

    c.set("getDictionary", getDictionary);

    await next();

    if (setHeader) {
      c.header("Content-Language", resolvedLocale as string);
    }
  };
}

export { dialex as dialexHono };
