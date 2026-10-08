import type { Middleware, ParameterizedContext } from "koa";
import {
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  extractCookieLocale,
  extractPathLocale,
  type LocaleResolverOptions,
} from "./resolver.js";
import type { DictionaryDefinition, Locales } from "./index.js";
import { autoScanAndLoadDictionaries } from "./scanner.js";
import { createGetDictionary, normalizeDictionaries } from "./shared.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export interface KoaI18nOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
   * If omitted, falls back to the auto-scanned dictionary registry.
   */
  dictionaries?:
    | Record<string, Record<string, any>>
    | (DictionaryDefinition<any, any> | Record<string, any>)[];
  /**
   * Whether to set the `Content-Language` header on the response.
   * @default true
   */
  setHeader?: boolean;
}

declare module "koa" {
  interface BaseContext {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Koa middleware for i18n detection and dictionary resolution.
 */
export function i18n(options: KoaI18nOptions = {}): Middleware {
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
  const cookieKeyList = Array.isArray(cookieKeys) ? cookieKeys : [cookieKeys];
  const customDictMap = normalizeDictionaries(options.dictionaries);

  let scanPromise: Promise<any> | undefined;
  if (!customDictMap) {
    scanPromise = autoScanAndLoadDictionaries(process.cwd(), {
      defaultLocale,
      locales,
    });
  }

  return async (ctx: ParameterizedContext, next) => {
    if (scanPromise) {
      await scanPromise;
    }

    const candidates: (string | null | undefined)[] = [];

    // 1. Custom extractor
    if (typeof custom === "function") {
      candidates.push(custom(ctx));
    }

    // 2. URL Path locale (e.g. /tr/api)
    if (usePath && ctx.path) {
      const pVal = extractPathLocale(ctx.path, locales);
      if (pVal) candidates.push(pVal);
    }

    // 3. Query parameters
    if (ctx.query && typeof ctx.query === "object") {
      for (const qk of queryKeyList) {
        const val = ctx.query[qk];
        if (typeof val === "string") candidates.push(val);
      }
    }

    // 4. Cookie (via Koa cookies API or raw header)
    try {
      if (ctx.cookies) {
        for (const ck of cookieKeyList) {
          const val = ctx.cookies.get(ck);
          if (typeof val === "string") candidates.push(val);
        }
      }
    } catch {
      // Ignore if ctx.cookies accessor fails in non-standard request contexts
    }
    if (ctx.headers && typeof ctx.headers.cookie === "string") {
      const cVal = extractCookieLocale(ctx.headers.cookie, cookieKeyList);
      if (cVal) candidates.push(cVal);
    }

    // 5. Accept-Language header
    const rawHeader = ctx.headers ? ctx.headers[headerKey.toLowerCase()] : undefined;
    const headerStr = Array.isArray(rawHeader) ? rawHeader.join(",") : rawHeader;
    if (headerStr) {
      candidates.push(...parseAcceptLanguage(headerStr));
    }

    // Resolve final locale
    const resolvedLocale = resolveLocaleFromCandidates(
      candidates,
      locales,
      defaultLocale,
    ) as Locales;

    // Attach to context
    ctx.locale = resolvedLocale;

    // Scoped getDictionary helper
    ctx.getDictionary = createGetDictionary({
      customDictMap,
      locale: resolvedLocale as string,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "koa",
    }) as <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;

    if (setHeader) {
      ctx.set("Content-Language", resolvedLocale as string);
    }

    await next();
  };
}

export default i18n;
