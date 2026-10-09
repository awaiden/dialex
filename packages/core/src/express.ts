import type { Request, Response, NextFunction, RequestHandler } from "express";
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

export interface ExpressDialexOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
   * If omitted, falls back to the bundled virtual dictionary registry.
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

declare global {
  namespace Express {
    interface Request {
      locale: Locales;
      getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
    }
    interface Locals {
      locale: Locales;
      getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
    }
  }
}

/**
 * Express middleware for i18n detection and dictionary resolution.
 */
export function dialex(options: ExpressDialexOptions = {}): RequestHandler {
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

  return async (req: Request, res: Response, next: NextFunction) => {
    if (scanPromise) {
      await scanPromise;
    }

    const candidates: (string | null | undefined)[] = [];

    // 1. Custom extractor
    if (typeof custom === "function") {
      candidates.push(custom(req));
    }

    // 2. URL Path locale (e.g. /tr/api)
    if (usePath && req.path) {
      const pVal = extractPathLocale(req.path, locales);
      if (pVal) candidates.push(pVal);
    }

    // 2. Query parameters
    if (req.query) {
      for (const qk of queryKeyList) {
        const val = req.query[qk];
        if (typeof val === "string") candidates.push(val);
      }
    }

    // 3. Cookie (from req.cookies object if cookie-parser is used, or from headers.cookie)
    const reqCookies = (req as any).cookies;
    if (reqCookies && typeof reqCookies === "object") {
      for (const ck of cookieKeyList) {
        if (typeof reqCookies[ck] === "string") {
          candidates.push(reqCookies[ck]);
        }
      }
    } else if (req.headers && typeof req.headers.cookie === "string") {
      const cVal = extractCookieLocale(req.headers.cookie, cookieKeyList);
      if (cVal) candidates.push(cVal);
    }

    // 4. Accept-Language header
    const rawHeader = req.headers ? req.headers[headerKey.toLowerCase()] : undefined;
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

    // Attach to Request
    req.locale = resolvedLocale;

    // Scoped getDictionary helper
    const getDictionary = createGetDictionary({
      customDictMap,
      locale: resolvedLocale as string,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "express",
    }) as <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;

    req.getDictionary = getDictionary;

    // Attach to res.locals for template engines
    if (res.locals) {
      res.locals.locale = resolvedLocale;
      res.locals.getDictionary = getDictionary;
    }

    if (setHeader && typeof res.setHeader === "function") {
      res.setHeader("Content-Language", resolvedLocale as string);
    }

    next();
  };
}
