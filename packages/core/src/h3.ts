import { defineEventHandler, getRequestHeader, getRequestURL, setResponseHeader } from "h3";

import { createT, type Locales, type Translate } from "./index.js";
import { autoScanAndLoadDictionaries } from "./lazy-scanner.js";
import { withConfig } from "./resolver.js";
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

export type H3DialexOptions = BaseAdapterOptions;

declare module "h3" {
  interface H3EventContext {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
    t: Translate;
  }
}

/**
 * h3 middleware (h3 1.x: Nitro 2, Nuxt 3/4 server routes) for i18n detection.
 * Adds `locale`, `getDictionary(name)` and `t` to `event.context`.
 *
 * ```ts
 * // server/middleware/dialex.ts (Nuxt / Nitro)
 * export default dialex({ locales: ["en", "tr"] });
 * ```
 */
export function dialex(rawOptions: H3DialexOptions = {}) {
  const options = withConfig(rawOptions);
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

  return defineEventHandler(async (event) => {
    if (scanPromise) await scanPromise;

    const url = getRequestURL(event);
    const locale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(event) : undefined,
      pathname: url.pathname,
      query: (key) => url.searchParams.get(key),
      cookieHeader: getRequestHeader(event, "cookie"),
      acceptLanguage: getRequestHeader(event, headerKey),
    });

    const getDictionary = createGetDictionary({
      customDictMap,
      locale,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "h3",
    }) as H3DialexContext["getDictionary"];

    event.context.locale = locale as Locales;
    event.context.getDictionary = getDictionary;
    event.context.t = createT(getDictionary, locale);

    if (setHeader) setResponseHeader(event, "Content-Language", locale);
  });
}

type H3DialexContext = {
  getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
};

export default dialex;

export { dialex as dialexH3 };
