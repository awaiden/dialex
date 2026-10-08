import { createT, type Locales, type Translate } from "../index.js";
import { createGetDictionary, normalizeDictionaries, type DictionaryInput } from "../shared.js";

export interface TestI18nOptions {
  /** Dictionaries to serve: `defineDictionary` results or a `{ name: { locale: content } }` map. */
  dictionaries: DictionaryInput;
  /** Active locale. Defaults to `defaultLocale`. */
  locale?: string;
  /** Fallback locale. @default "en" */
  defaultLocale?: string;
  /** Explicit [fallback chains](../guide/fallbacks.md). */
  fallbacks?: Record<string, string[]>;
}

export interface TestI18n {
  locale: Locales;
  getDictionary: (name: string) => any;
  t: Translate;
  /** The same dictionaries under another locale. */
  withLocale(locale: string): TestI18n;
}

/**
 * A self-contained i18n context for unit tests: no bundler plugin, config file, or request needed.
 *
 * ```ts
 * const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });
 * expect(i18n.t("home.title")).toBe("Hoş Geldiniz");
 * expect(i18n.withLocale("en").getDictionary("home").title).toBe("Welcome");
 * ```
 */
export function createTestI18n(options: TestI18nOptions): TestI18n {
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
    withLocale: (next) => createTestI18n({ ...options, locale: next }),
  };
}

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
