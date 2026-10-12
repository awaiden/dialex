import type { Plugin, Request, ResponseObject } from "@hapi/hapi";

import type { Locales } from "./index.js";
import { withConfig } from "./resolver.js";
import {
  createGetDictionary,
  normalizeDictionaries,
  resolveRequestLocale,
  type BaseAdapterOptions,
} from "./shared.js";

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
 * Options of the Hapi plugin: the shared locale detection options plus `dictionaries` and `setHeader`.
 */
export type HapiDialexOptions = BaseAdapterOptions;

declare module "@hapi/hapi" {
  interface Request {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Hapi plugin for i18n detection and dictionary resolution.
 *
 * ```ts
 * await server.register({ plugin: dialexPlugin, options: { ...dialex } });
 *
 * server.route({
 *   method: "GET",
 *   path: "/",
 *   handler: (request) => ({ title: request.getDictionary("home").title }),
 * });
 * ```
 */
export const dialexPlugin: Plugin<HapiDialexOptions> = {
  name: "dialex",
  register(server, rawOptions) {
    const options = withConfig(rawOptions ?? {});
    const {
      defaultLocale = "en",
      headerKey = "accept-language",
      custom,
      setHeader = true,
    } = options;
    const customDictMap = normalizeDictionaries(options.dictionaries);

    // Declare the properties; `onRequest` fills them in for each request.
    server.decorate("request", "locale", defaultLocale);
    server.decorate("request", "getDictionary", () => ({}));

    server.ext("onRequest", (request, h) => {
      const locale = resolveRequestLocale(options, {
        custom: typeof custom === "function" ? custom(request) : undefined,
        pathname: request.path,
        query: (key) => {
          const value = request.query[key];
          return typeof value === "string" ? value : undefined;
        },
        cookieHeader: request.headers.cookie as string | undefined,
        acceptLanguage: request.headers[headerKey.toLowerCase()] as string | undefined,
      });
      request.locale = locale;
      request.getDictionary = createGetDictionary({
        customDictMap,
        locale,
        defaultLocale,
        fallbacks: options.fallbacks,
        tag: "hapi",
      }) as Request["getDictionary"];
      return h.continue;
    });

    if (setHeader) {
      server.ext("onPreResponse", (request, h) => {
        const locale = request.locale;
        const response = request.response;
        if (!locale) return h.continue;
        if ("isBoom" in response && response.isBoom) {
          response.output.headers["content-language"] = locale;
        } else {
          (response as ResponseObject).header("content-language", locale);
        }
        return h.continue;
      });
    }
  },
};

export default dialexPlugin;

export { dialexPlugin as dialexHapi };
