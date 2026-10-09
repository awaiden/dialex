import type { MiddlewareHandler } from "astro";
import { createT, type Locales, type Translate } from "./index.js";
import { autoScanAndLoadDictionaries } from "./scanner.js";
import {
  createGetDictionary,
  normalizeDictionaries,
  resolveRequestLocale,
  type BaseAdapterOptions,
} from "./shared.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

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
export function dialex(options: AstroDialexOptions = {}): MiddlewareHandler {
  const {
    defaultLocale = "en",
    locales,
    headerKey = "accept-language",
    custom,
    setHeader = true,
  } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  let scanPromise: Promise<any> | undefined;
  if (!customDictMap) {
    scanPromise = autoScanAndLoadDictionaries(process.cwd(), { defaultLocale, locales });
  }

  return async (context, next) => {
    if (scanPromise) await scanPromise;

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
