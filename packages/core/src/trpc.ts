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

export type TrpcDialexOptions = BaseAdapterOptions;

/** What `createContext` of a tRPC adapter hands over: a Fetch `Request`, or Node-style headers. */
export type TrpcRequestLike =
  | Request
  | {
      headers: Headers | Record<string, string | string[] | undefined>;
      /** Request URL or path. Used for the path and query string. */
      url?: string;
    };

/** The i18n part of a tRPC context. Spread it into your own context. */
export interface TrpcDialexContext {
  locale: Locales;
  getDictionary: <K extends DictionaryKey>(name: K) => ResolveDictionaryType<K>;
  t: Translate;
}

function readHeader(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
  const value = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()];
  return Array.isArray(value) ? value.join(",") : (value ?? null);
}

/**
 * Locale detection for tRPC. The result belongs in the context, so every procedure can read
 * `ctx.locale` and `ctx.getDictionary("errors")`:
 *
 * ```ts
 * const resolveDialex = createDialexContext({ ...dialex });
 *
 * export const createContext = ({ req }: { req: Request }) => ({
 *   ...resolveDialex(req),
 * });
 *
 * const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();
 * export const greet = t.procedure.query(({ ctx }) => ctx.getDictionary("home").title);
 * ```
 *
 * It works with the fetch, Next.js, Express and standalone adapters: all of them give
 * `createContext` a request with `headers` and a `url`.
 */
export function createDialexContext(
  rawOptions: TrpcDialexOptions = {},
): (request: TrpcRequestLike) => TrpcDialexContext {
  const options = withConfig(rawOptions);
  const { defaultLocale = "en", headerKey = "accept-language", custom } = options;
  const customDictMap = normalizeDictionaries(options.dictionaries);

  return (request) => {
    let pathname: string | undefined;
    let params: URLSearchParams | undefined;
    if (request.url) {
      try {
        const url = new URL(request.url, "http://localhost");
        pathname = url.pathname;
        params = url.searchParams;
      } catch {
        // A malformed URL only means there is no path or query to read.
      }
    }

    const locale = resolveRequestLocale(options, {
      custom: typeof custom === "function" ? custom(request) : undefined,
      pathname,
      query: (key) => params?.get(key),
      cookieHeader: readHeader(request.headers, "cookie"),
      acceptLanguage: readHeader(request.headers, headerKey),
    });

    const getDictionary = createGetDictionary({
      customDictMap,
      locale,
      defaultLocale,
      fallbacks: options.fallbacks,
      tag: "trpc",
    }) as TrpcDialexContext["getDictionary"];

    return { locale, getDictionary, t: createT(getDictionary, locale) };
  };
}

export default createDialexContext;

export { createDialexContext as dialexTrpc };
