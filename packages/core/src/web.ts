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

export type WebDialexOptions = BaseAdapterOptions;

export interface WebDialex {
  locale: Locales;
  getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  t: Translate;
  /** Response headers to send, currently `Content-Language` (empty when `setHeader` is `false`). */
  headers: Record<string, string>;
  /** Returns `response` with the i18n headers applied. */
  applyHeaders<R extends Response>(response: R): R;
}

/**
 * Locale detection for any framework that exposes a standard Fetch API `Request`
 * (React Router / Remix loaders, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun...).
 *
 * ```ts
 * const resolveDialex = createDialexHandler({ locales: ["en", "tr"], dictionaries });
 *
 * export async function loader({ request }: { request: Request }) {
 *   const { locale, getDictionary } = await resolveDialex(request);
 *   return { locale, title: getDictionary("home").title };
 * }
 * ```
 */
export function createDialexHandler(
  options: WebDialexOptions = {},
): (request: Request) => Promise<WebDialex> {
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

  return async (request) => {
    if (scanPromise) await scanPromise;

    const url = new URL(request.url);
    const locale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(request) : undefined,
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
      tag: "web",
    }) as WebDialex["getDictionary"];

    const headers: Record<string, string> = setHeader ? { "Content-Language": locale } : {};

    return {
      locale: locale as Locales,
      getDictionary,
      t: createT(getDictionary, locale),
      headers,
      applyHeaders(response) {
        try {
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
          return response;
        } catch {
          // Headers of responses from fetch() or Response.redirect() are immutable: copy.
          const copy = new Response(response.body, response);
          for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value);
          return copy as typeof response;
        }
      },
    };
  };
}

export default createDialexHandler;
