import type { MiddlewareHandler } from "astro";

import { type Locales } from "../core/registry.js";
import { withConfig } from "../core/resolver.js";
import {
  createGetDictionary,
  normalizeDictionaries,
  resolveRequestLocale,
  type BaseAdapterOptions,
} from "../core/shared.js";
import { createT, type Translate } from "../core/translate.js";

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
 * Options of the Astro middleware: the shared locale detection options plus `dictionaries` and `setHeader`.
 */
export type AstroDialexOptions = BaseAdapterOptions;

declare global {
  namespace App {
    interface Locals {
      locale: Locales;
      getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
      t: Translate;
    }
  }
}

/**
 * Astro middleware for i18n detection and dictionary resolution.
 * Adds `locale` and `getDictionary(name)` to `Astro.locals`.
 *
 * ```ts
 * // src/middleware.ts
 * export const onRequest = dialex({ locales: ["en", "tr"] });
 * ```
 */
export function dialex(rawOptions: AstroDialexOptions = {}): MiddlewareHandler {
  const options = withConfig(rawOptions);
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  return async (context, next) => {
    const { request, url } = context;

    const locale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(context) : undefined,
      pathname: url.pathname,
      query: (key) => url.searchParams.get(key),
      cookieHeader: request.headers.get("cookie"),
      acceptLanguage: request.headers.get(headerKey),
    });

    context.locals.locale = locale;
    context.locals.getDictionary = createGetDictionary({
      customDictMap,
      locale,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "astro",
    }) as App.Locals["getDictionary"];
    context.locals.t = createT(context.locals.getDictionary, locale);

    const response = await next();

    if (setHeader) {
      try {
        response.headers.set("Content-Language", locale as string);
      } catch {
        // Immutable headers; skip.
      }
    }
    return response;
  };
}

export default dialex;

export { dialex as dialexAstro };
