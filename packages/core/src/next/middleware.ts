import { NextResponse, type NextRequest } from "next/server.js";
import { localizePath, stripLocale, type RoutingOptions } from "../routing.js";
import { resolveRequestLocale } from "../shared.js";
import type { LocaleResolverOptions } from "../resolver.js";

export interface I18nMiddlewareOptions
  extends RoutingOptions, Omit<LocaleResolverOptions, "locales" | "defaultLocale" | "usePath"> {
  /**
   * Cookie that remembers the visitor's locale.
   * @default "locale"
   */
  cookieName?: string;
  /**
   * Write the cookie when the URL's locale differs from the stored one.
   * @default true
   */
  setCookie?: boolean;
  /**
   * Paths that skip locale handling. By default `/_next`, `/api`, and anything with a file
   * extension (`/favicon.ico`, `/robots.txt`) are skipped.
   */
  ignore?: (pathname: string) => boolean;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

const defaultIgnore = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname === "/api" ||
  pathname.startsWith("/api/") ||
  /\.[a-z0-9]+$/i.test(pathname);

/**
 * Next.js middleware that keeps every page under a locale prefix.
 *
 * - `/about` is redirected to `/tr/about`, using the `locale` cookie, `?locale=`, then `Accept-Language`.
 * - With `prefixDefault: false` the default locale is served from the unprefixed path (rewritten
 *   internally to `/en/about`) and `/en/about` redirects back to `/about`.
 *
 * ```ts
 * // middleware.ts
 * export default createI18nMiddleware({ locales: ["en", "tr"], defaultLocale: "en" });
 * export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
 * ```
 */
export function createI18nMiddleware(options: I18nMiddlewareOptions) {
  const {
    locales,
    prefixDefault = true,
    cookieName = "locale",
    setCookie = true,
    ignore = defaultIgnore,
    headerKey = "accept-language",
    custom,
  } = options;
  const defaultLocale = options.defaultLocale ?? locales[0];
  const routing = { locales, defaultLocale, prefixDefault };

  const remember = (request: NextRequest, response: NextResponse, locale: string) => {
    if (setCookie && request.cookies.get(cookieName)?.value !== locale) {
      response.cookies.set(cookieName, locale, { path: "/", sameSite: "lax", maxAge: ONE_YEAR });
    }
    return response;
  };

  return function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;
    if (ignore(pathname)) return NextResponse.next();

    const { path: barePath, locale: pathLocale } = stripLocale(pathname, locales);

    if (pathLocale) {
      if (!prefixDefault && pathLocale === defaultLocale) {
        const url = request.nextUrl.clone();
        url.pathname = barePath;
        return remember(request, NextResponse.redirect(url), pathLocale);
      }
      return remember(request, NextResponse.next(), pathLocale);
    }

    const detected = resolveRequestLocale(
      {
        ...options,
        defaultLocale,
        usePath: false,
        cookieKeys: options.cookieKeys ?? [cookieName],
      },
      {
        custom: typeof custom === "function" ? custom(request) : undefined,
        query: (key) => request.nextUrl.searchParams.get(key),
        cookieHeader: request.headers.get("cookie"),
        acceptLanguage: request.headers.get(headerKey),
      },
    ) as string;

    const url = request.nextUrl.clone();
    if (!prefixDefault && detected === defaultLocale) {
      url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
      return remember(request, NextResponse.rewrite(url), detected);
    }

    url.pathname = localizePath(pathname, detected, routing);
    return remember(request, NextResponse.redirect(url), detected);
  };
}

export default createI18nMiddleware;
