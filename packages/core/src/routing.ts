export interface RoutingOptions {
  /** Supported locales. */
  locales: string[];
  /** Locale used when none is detected. */
  defaultLocale?: string;
  /**
   * Whether the default locale also gets a path prefix (`/en/about`).
   * When `false`, the default locale lives at the unprefixed path (`/about`).
   * @default true
   */
  prefixDefault?: boolean;
}

const EXTERNAL = /^(?:[a-z][a-z\d+\-.]*:|\/\/|#)/i;

function splitPath(path: string): { pathname: string; suffix: string } {
  const index = path.search(/[?#]/);
  return index === -1
    ? { pathname: path, suffix: "" }
    : { pathname: path.slice(0, index), suffix: path.slice(index) };
}

function findLocale(segment: string | undefined, locales: string[]): string | undefined {
  if (!segment) return undefined;
  const lower = segment.toLowerCase();
  return locales.find((l) => l.toLowerCase() === lower);
}

/**
 * Removes a leading locale segment from a path. Query strings and fragments are preserved.
 * Only exact (case-insensitive) matches of `locales` count, so `/english` is left alone.
 */
export function stripLocale(path: string, locales: string[]): { path: string; locale?: string } {
  const { pathname, suffix } = splitPath(path);
  const segments = pathname.split("/").filter(Boolean);
  const locale = findLocale(segments[0], locales);
  if (!locale) return { path };

  const rest = "/" + segments.slice(1).join("/");
  const trailing = pathname.length > 1 && pathname.endsWith("/") && segments.length > 1;
  return { path: rest + (trailing ? "/" : "") + suffix, locale };
}

/**
 * Returns the locale a path is under, or `defaultLocale` when it has no locale prefix.
 *
 * ```ts
 * localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
 * localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
 * ```
 */
export function localeFromPath(
  path: string,
  options: RoutingOptions & { defaultLocale: string },
): string {
  return stripLocale(path, options.locales).locale ?? options.defaultLocale;
}

/** Whether `value` is exactly one of `locales`. */
export function isLocale(value: string, locales: string[]): boolean {
  return locales.includes(value);
}

/**
 * Prefixes a path with a locale, replacing any locale prefix it already has.
 * External URLs, `mailto:` links and bare `#fragments` are returned unchanged.
 *
 * ```ts
 * localizePath("/about", "tr", { locales: ["en", "tr"] }); // "/tr/about"
 * localizePath("/tr/about", "en", { locales: ["en", "tr"], defaultLocale: "en", prefixDefault: false }); // "/about"
 * ```
 */
export function localizePath(path: string, locale: string, options: RoutingOptions): string {
  if (EXTERNAL.test(path)) return path;

  const { prefixDefault = true, defaultLocale } = options;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const { path: bare } = stripLocale(normalized, options.locales);

  if (!prefixDefault && locale === defaultLocale) return bare;

  const { pathname, suffix } = splitPath(bare);
  const prefixed = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return prefixed + suffix;
}

export interface AlternateLink {
  /** Locale tag, or `"x-default"`. */
  locale: string;
  href: string;
}

export interface AlternateLinksOptions extends RoutingOptions {
  /** Origin used to build absolute URLs, e.g. `https://example.com`. */
  baseUrl: string;
  /** Add an `x-default` entry pointing at the default locale. @default true */
  xDefault?: boolean;
}

/**
 * Builds `hreflang` alternates for a path, one per locale.
 *
 * ```ts
 * alternateLinks("/about", { locales: ["en", "tr"], baseUrl: "https://example.com" });
 * // [{ locale: "en", href: "https://example.com/en/about" }, { locale: "tr", ... }, { locale: "x-default", ... }]
 * ```
 */
export function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[] {
  const base = options.baseUrl.replace(/\/+$/, "");
  const links = options.locales.map((locale) => ({
    locale,
    href: base + localizePath(path, locale, options),
  }));

  const defaultLocale = options.defaultLocale ?? options.locales[0];
  if (options.xDefault !== false && defaultLocale) {
    links.push({ locale: "x-default", href: base + localizePath(path, defaultLocale, options) });
  }
  return links;
}

/** `alternateLinks` as a `{ [locale]: url }` map, the shape of Next.js `metadata.alternates.languages`. */
export function alternateLanguages(
  path: string,
  options: AlternateLinksOptions,
): Record<string, string> {
  return Object.fromEntries(alternateLinks(path, options).map((l) => [l.locale, l.href]));
}

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  alternates: { languages: Record<string, string> };
}

/**
 * Sitemap entries (one per path and locale) with hreflang alternates, in the shape of the
 * Next.js `MetadataRoute.Sitemap` type.
 */
export function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[] {
  const base = options.baseUrl.replace(/\/+$/, "");
  return paths.flatMap((path) => {
    const languages = alternateLanguages(path, options);
    return options.locales.map((locale) => ({
      url: base + localizePath(path, locale, options),
      ...(options.lastModified ? { lastModified: options.lastModified } : {}),
      alternates: { languages },
    }));
  });
}
