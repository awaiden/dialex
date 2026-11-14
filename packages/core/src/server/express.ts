import type { Request, Response, NextFunction, RequestHandler } from "express";

import type { Locales } from "../core/registry.js";
import { withConfig } from "../core/resolver.js";
import {
  createGetDictionary,
  normalizeDictionaries,
  resolveRequestLocale,
  type BaseAdapterOptions,
} from "../core/shared.js";

/**
 * Maps dictionary names to their content types. `dialex generate` augments it in
 * `dialex-env.d.ts`, which is what types `getDictionary("home")` and autocompletes the names.
 * Leave it empty in your own code.
 */
export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

/**
 * Options of the Express middleware: the shared locale detection options, the dictionaries to read and whether to send `Content-Language`.
 */
export type ExpressDialexOptions = BaseAdapterOptions;

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
export function dialex(rawOptions: ExpressDialexOptions = {}): RequestHandler {
  const options = withConfig(rawOptions);
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  return async (req: Request, res: Response, next: NextFunction) => {
    const reqCookies = (req as any).cookies;
    const cookieHeader =
      reqCookies && typeof reqCookies === "object"
        ? Object.entries(reqCookies)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(([k, v]) => `${k}=${v}`)
            .join("; ")
        : req.headers?.cookie;

    const rawHeader = req.headers?.[headerKey.toLowerCase()];
    const acceptLanguage = Array.isArray(rawHeader) ? rawHeader.join(",") : rawHeader;

    const resolvedLocale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(req) : undefined,
      pathname: req.path,
      query: (key) => {
        const val = req.query?.[key];
        return typeof val === "string" ? val : undefined;
      },
      cookieHeader,
      acceptLanguage,
    });

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

export { dialex as dialexExpress };
