import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

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
 * Options of the Fastify plugin: the shared locale detection options, the dictionaries to read and whether to send `Content-Language`.
 */
export type FastifyDialexOptions = BaseAdapterOptions;

declare module "fastify" {
  interface FastifyRequest {
    locale: Locales;
    getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  }
}

/**
 * Fastify plugin for i18n detection and dictionary resolution.
 */
const dialexPluginFn: FastifyPluginAsync<FastifyDialexOptions> = async (fastify, rawOptions) => {
  const options = withConfig(rawOptions ?? {});
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  // Decorate FastifyRequest prototype for TypeScript and Fastify internals
  if (!fastify.hasRequestDecorator("locale")) {
    fastify.decorateRequest("locale", defaultLocale as Locales);
  }
  if (!fastify.hasRequestDecorator("getDictionary")) {
    fastify.decorateRequest("getDictionary", (() => ({})) as any);
  }

  fastify.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
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
      pathname: req.url,
      query: (key) => {
        if (!req.query || typeof req.query !== "object") return undefined;
        const val = (req.query as Record<string, any>)[key];
        return typeof val === "string" ? val : undefined;
      },
      cookieHeader,
      acceptLanguage,
    });

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

/**
 * The Fastify plugin. Register it with `app.register(dialexPlugin, { ...dialex })`; it decorates every request with `locale` and `getDictionary(name)` and sets `Content-Language`.
 */
export const dialexPlugin = fp(dialexPluginFn, {
  name: "dialex-fastify",
  fastify: ">=4.0.0",
});

export default dialexPlugin;
