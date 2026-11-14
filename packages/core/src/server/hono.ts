import type { Context, MiddlewareHandler } from "hono";

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
 * Options of the Hono middleware: the shared locale detection options, the dictionaries to read and whether to send `Content-Language`.
 */
export type HonoDialexOptions = BaseAdapterOptions;

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
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  return async (c: Context, next) => {
    const resolvedLocale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(c) : undefined,
      pathname: c.req.path,
      query: (key) => c.req.query(key),
      cookieHeader: c.req.header("cookie"),
      acceptLanguage: c.req.header(headerKey),
    });

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
