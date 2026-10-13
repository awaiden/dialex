import {
  createGetDictionary,
  normalizeDictionaries,
  type DictionaryInput,
} from "../core/shared.js";
import { createT, type Locales, type Translate } from "../index.js";

/**
 * Options of `createTestDialex`: the dictionaries to serve and the locale to render with.
 */
export interface TestDialexOptions {
  /** Dictionaries to serve: `defineDictionary` results or a `{ name: { locale: content } }` map. */
  dictionaries: DictionaryInput;
  /** Active locale. Defaults to `defaultLocale`. */
  locale?: string;
  /** Fallback locale. @default "en" */
  defaultLocale?: string;
  /** Explicit [fallback chains](../guide/fallbacks.md). */
  fallbacks?: Record<string, string[]>;
}

/**
 * The test context `createTestDialex` returns: the locale, `getDictionary`, `t`, and `withLocale` to switch locale.
 */
export interface TestDialex {
  locale: Locales;
  getDictionary: (name: string) => any;
  t: Translate;
  /** The same dictionaries under another locale. */
  withLocale(locale: string): TestDialex;
}

/**
 * A self-contained i18n context for unit tests: no bundler plugin, config file, or request needed.
 *
 * ```ts
 * const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
 * expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
 * expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
 * ```
 */
export function createTestDialex(options: TestDialexOptions): TestDialex {
  const defaultLocale = options.defaultLocale ?? "en";
  const locale = options.locale ?? defaultLocale;
  const customDictMap = normalizeDictionaries(options.dictionaries) ?? {};

  const getDictionary = createGetDictionary({
    customDictMap,
    locale,
    defaultLocale,
    fallbacks: options.fallbacks,
    tag: "testing",
  });

  return {
    locale: locale as Locales,
    getDictionary,
    t: createT(getDictionary, locale),
    withLocale: (next) => createTestDialex({ ...options, locale: next }),
  };
}

/**
 * Options of `mockRequest`: the locale to resolve to, how it is conveyed (header, cookie, query or path) and the usual request parts.
 */
export interface MockRequestOptions {
  /** Locale the request should resolve to. */
  locale?: string;
  /**
   * How the locale is conveyed: the `Accept-Language` header, the `locale` cookie, the
   * `?locale=` query parameter, or a leading path segment.
   * @default "header"
   */
  via?: "header" | "cookie" | "query" | "path";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  method?: string;
  body?: BodyInit | null;
}

/**
 * Builds a standard `Request` that a dialex adapter will resolve to `options.locale`.
 * Relative URLs are resolved against `http://localhost`.
 *
 * ```ts
 * const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
 * ```
 */
export function mockRequest(url: string, options: MockRequestOptions = {}): Request {
  const { locale, via = "header", method, body } = options;
  const target = new URL(url, "http://localhost");
  const headers = new Headers(options.headers);
  const cookies = { ...options.cookies };

  if (locale) {
    if (via === "header") headers.set("accept-language", locale);
    else if (via === "cookie") cookies.locale = locale;
    else if (via === "query") target.searchParams.set("locale", locale);
    else target.pathname = `/${locale}${target.pathname === "/" ? "" : target.pathname}`;
  }

  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new Request(target, { method, headers, body });
}
