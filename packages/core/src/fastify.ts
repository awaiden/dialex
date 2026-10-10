import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

import type { DictionaryDefinition, Locales } from "./index.js";
import {
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  extractCookieLocale,
  extractPathLocale,
  type LocaleResolverOptions,
  withConfig,
} from "./resolver.js";
import { createGetDictionary, normalizeDictionaries } from "./shared.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export interface FastifyDialexOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
   * If omitted, only dictionaries already registered through `defineDictionary` are found.
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

declare module "fastify" {
  interface FastifyRequest {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

import fp from "fastify-plugin";

/**
 * Fastify plugin for i18n detection and dictionary resolution.
 */
const dialexPluginFn: FastifyPluginAsync<FastifyDialexOptions> = async (fastify, rawOptions) => {
  const options = withConfig(rawOptions ?? {});
  const {
    defaultLocale = "en",
    locales,
    queryKeys = ["locale", "lang"],
    cookieKeys = ["locale", "lang"],
    headerKey = "accept-language",
    custom,
    setHeader = true,
    usePath = true,
  } = options || {};

  const queryKeyList = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
  const cookieKeyList = Array.isArray(cookieKeys) ? cookieKeys : [cookieKeys];
  const customDictMap = normalizeDictionaries(options?.dictionaries);

  // Decorate FastifyRequest prototype for TypeScript and Fastify internals
  if (!fastify.hasRequestDecorator("locale")) {
    fastify.decorateRequest("locale", defaultLocale as Locales);
  }
  if (!fastify.hasRequestDecorator("getDictionary")) {
    fastify.decorateRequest("getDictionary", (() => ({})) as any);
  }

  fastify.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const candidates: (string | null | undefined)[] = [];

    // 1. Custom extractor
    if (typeof custom === "function") {
      candidates.push(custom(req));
    }

    // 2. URL Path locale (e.g. /tr/api)
    if (usePath && req.url) {
      const pVal = extractPathLocale(req.url, locales);
      if (pVal) candidates.push(pVal);
    }

    // 3. Query parameters
    if (req.query && typeof req.query === "object") {
      for (const qk of queryKeyList) {
        const val = (req.query as Record<string, any>)[qk];
        if (typeof val === "string") candidates.push(val);
      }
    }

    // 4. Cookie (from req.cookies object if @fastify/cookie is used, or from headers.cookie)
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

    // 5. Accept-Language header
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
    req.getDictionary = createGetDictionary({
      customDictMap,
      locale: resolvedLocale as string,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "fastify",
    }) as <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;

    if (setHeader) {
      reply.header("Content-Language", resolvedLocale as string);
    }
  });
};

export const dialexPlugin = fp(dialexPluginFn, {
  name: "dialex-fastify",
  fastify: ">=4.0.0",
});

export default dialexPlugin;
