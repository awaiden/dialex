import { createT, type Locales, type Translate } from "./index.js";
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

export type SvelteKitDialexOptions = BaseAdapterOptions;

type MaybePromise<T> = T | Promise<T>;

interface HandleEvent {
  url: URL;
  request: Request;
  locals: App.Locals;
}

/**
 * Structural equivalent of SvelteKit's `Handle`, declared locally so the adapter
 * type-checks against both SvelteKit 2 and 3 without importing from `@sveltejs/kit`.
 */
export type Handle = (input: {
  event: HandleEvent;
  resolve: (
    event: HandleEvent,
    opts?: {
      transformPageChunk?: (input: {
        html: string;
        done: boolean;
      }) => MaybePromise<string | undefined>;
    },
  ) => MaybePromise<Response>;
}) => MaybePromise<Response>;

declare global {
  namespace App {
    interface Locals {
      locale: Locales;
      getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
      t: Translate;
    }
  }
}

/** Placeholder to put in `src/app.html` (e.g. `<html lang="%dialex.lang%">`). */
export const LANG_PLACEHOLDER = "%dialex.lang%";

/**
 * SvelteKit `handle` hook for i18n detection and dictionary resolution.
 * Adds `locale` and `getDictionary(name)` to `event.locals` and replaces
 * `%dialex.lang%` in the rendered HTML with the resolved locale.
 */
export function dialexHandle(rawOptions: SvelteKitDialexOptions = {}): Handle {
  const options = withConfig(rawOptions);
  const { defaultLocale = "en", headerKey = "accept-language", custom, setHeader = true } = options;

  const customDictMap = normalizeDictionaries(options.dictionaries);

  return async ({ event, resolve }) => {
    const locale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(event) : undefined,
      pathname: event.url.pathname,
      query: (key) => event.url.searchParams.get(key),
      cookieHeader: event.request.headers.get("cookie"),
      acceptLanguage: event.request.headers.get(headerKey),
    });

    event.locals.locale = locale;
    event.locals.getDictionary = createGetDictionary({
      customDictMap,
      locale,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "sveltekit",
    }) as App.Locals["getDictionary"];
    event.locals.t = createT(event.locals.getDictionary, locale);

    const response = await resolve(event, {
      transformPageChunk: ({ html }) => html.replaceAll(LANG_PLACEHOLDER, locale as string),
    });

    if (setHeader) {
      try {
        response.headers.set("Content-Language", locale as string);
      } catch {
        // Immutable headers (e.g. redirects from fetch); skip.
      }
    }
    return response;
  };
}

export default dialexHandle;
