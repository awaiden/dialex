import type { Middleware, ParameterizedContext } from "koa";

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
 * Options of the Koa middleware: the shared locale detection options, the dictionaries to read and whether to send `Content-Language`.
 */
export type KoaDialexOptions = BaseAdapterOptions;

declare module "koa" {
  interface BaseContext {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Koa middleware for i18n detection and dictionary resolution.
 */
export function dialex(rawOptions: KoaDialexOptions = {}): Middleware {
  const options = withConfig(rawOptions);
  const {
    defaultLocale = "en",
    cookieKeys = ["locale", "lang"],
    headerKey = "accept-language",
    custom,
    setHeader = true,
  } = options;

  const cookieKeyList = Array.isArray(cookieKeys) ? cookieKeys : [cookieKeys];
  const customDictMap = normalizeDictionaries(options.dictionaries);

  return async (ctx: ParameterizedContext, next) => {
    let cookieHeader = typeof ctx.headers?.cookie === "string" ? ctx.headers.cookie : undefined;
    if (!cookieHeader && ctx.cookies) {
      const pairs: string[] = [];
      for (const ck of cookieKeyList) {
        try {
          const val = ctx.cookies.get(ck);
          if (typeof val === "string") pairs.push(`${ck}=${val}`);
        } catch {
          // Ignore if ctx.cookies accessor fails in non-standard request contexts
        }
      }
      if (pairs.length > 0) cookieHeader = pairs.join("; ");
    }

    const rawHeader = ctx.headers?.[headerKey.toLowerCase()];
    const acceptLanguage = Array.isArray(rawHeader) ? rawHeader.join(",") : rawHeader;

    const resolvedLocale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(ctx) : undefined,
      pathname: ctx.path,
      query: (key) => {
        if (!ctx.query || typeof ctx.query !== "object") return undefined;
        const val = ctx.query[key];
        return typeof val === "string" ? val : undefined;
      },
      cookieHeader,
      acceptLanguage,
    });

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

export default dialex;

export { dialex as dialexKoa };
