import type { HttpContext } from "@adonisjs/http-server";

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
 * Options of the AdonisJS middleware: the shared locale detection options plus `dictionaries` and `setHeader`.
 */
export type AdonisDialexOptions = BaseAdapterOptions;

declare module "@adonisjs/http-server" {
  interface HttpContext {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Builds the middleware class for AdonisJS (v6 and later). Put it in a middleware file and
 * register it as a router middleware:
 *
 * ```ts
 * // app/middleware/dialex_middleware.ts
 * import { createDialexMiddleware } from "dialexjs/adonis";
 * import { dialex } from "#start/dialex.generated";
 *
 * export default createDialexMiddleware({ ...dialex });
 *
 * // start/kernel.ts
 * router.use([() => import("#middleware/dialex_middleware")]);
 * ```
 *
 * Handlers then read `ctx.locale` and `ctx.getDictionary("home")`.
 */
export function createDialexMiddleware(rawOptions: AdonisDialexOptions = {}) {
  const options = withConfig(rawOptions);
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;
  const customDictMap = normalizeDictionaries(options.dictionaries);

  return class DialexMiddleware {
    async handle(ctx: HttpContext, next: () => Promise<unknown>) {
      const { request, response } = ctx;
      const queryString = request.qs() as Record<string, unknown>;

      const locale = resolveRequestLocale(options, {
        custom: typeof custom === "function" ? custom(ctx) : undefined,
        pathname: request.url(),
        query: (key) => {
          const value = queryString[key];
          return typeof value === "string" ? value : undefined;
        },
        cookieHeader: request.header("cookie"),
        acceptLanguage: request.header(headerKey.toLowerCase()),
      });

      ctx.locale = locale;
      ctx.getDictionary = createGetDictionary({
        customDictMap,
        locale,
        defaultLocale,
        fallbacks: options.fallbacks,
        tag: "adonis",
      }) as HttpContext["getDictionary"];

      if (setHeader) response.header("Content-Language", locale);

      return next();
    }
  };
}

export default createDialexMiddleware;

export { createDialexMiddleware as dialexAdonis };
