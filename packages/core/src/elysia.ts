import { Elysia } from "elysia";

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

export type ElysiaDialexOptions = BaseAdapterOptions;

/**
 * Elysia plugin for i18n detection and dictionary resolution.
 * Adds `locale` and `getDictionary(name)` to the request context.
 */
export function dialex(rawOptions: ElysiaDialexOptions = {}) {
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

  return new Elysia({ name: "dialex-elysia", seed: options })
    .derive({ as: "global" }, async (context) => {
      if (scanPromise) await scanPromise;

      const { request } = context;
      const url = new URL(request.url);

      const locale = resolveRequestLocale(options, {
        custom: typeof custom === "function" ? custom(context) : undefined,
        pathname: url.pathname,
        query: (key) => url.searchParams.get(key),
        cookieHeader: request.headers.get("cookie"),
        acceptLanguage: request.headers.get(headerKey),
      });

      const getDictionary = createGetDictionary({
        customDictMap,
        locale,
        defaultLocale,
        fallbacks: options.fallbacks,
        tag: "elysia",
      }) as <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;

      return {
        locale: locale as Locales,
        getDictionary,
        t: createT(getDictionary, locale) as Translate,
      };
    })
    .onAfterHandle({ as: "global" }, ({ locale, set }) => {
      if (setHeader) set.headers["content-language"] = locale as string;
    });
}

export default dialex;

export { dialex as dialexElysia };
