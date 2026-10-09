import { describe, expect, it } from "vite-plus/test";
import { NextRequest } from "next/server.js";
import { createDialexMiddleware } from "../src/next/middleware.js";

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, { headers });

const location = (res: Response) => res.headers.get("location");
const rewrite = (res: Response) => res.headers.get("x-middleware-rewrite");
const next = (res: Response) => res.headers.get("x-middleware-next");

describe("createDialexMiddleware", () => {
  const middleware = createDialexMiddleware({ locales: ["en", "tr"], defaultLocale: "en" });

  it("redirects unprefixed paths using Accept-Language and keeps the query string", () => {
    const res = middleware(request("/about?x=1", { "accept-language": "tr-TR,tr;q=0.9" }));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("http://localhost/tr/about?x=1");
    expect(res.cookies.get("locale")?.value).toBe("tr");
  });

  it("prefers the cookie over Accept-Language, and a ?locale= override over the cookie", () => {
    const withCookie = middleware(request("/", { cookie: "locale=tr", "accept-language": "en" }));
    expect(location(withCookie)).toBe("http://localhost/tr");

    const withQuery = middleware(request("/?locale=en", { cookie: "locale=tr" }));
    expect(location(withQuery)).toBe("http://localhost/en?locale=en");
  });

  it("falls back to the default locale", () => {
    expect(location(middleware(request("/pricing", { "accept-language": "fr" })))).toBe(
      "http://localhost/en/pricing",
    );
  });

  it("passes through paths that already have a locale and remembers it", () => {
    const res = middleware(request("/tr/about", { cookie: "locale=en" }));
    expect(next(res)).toBe("1");
    expect(res.cookies.get("locale")?.value).toBe("tr");

    const same = middleware(request("/tr/about", { cookie: "locale=tr" }));
    expect(same.cookies.get("locale")).toBeUndefined();
  });

  it("skips _next, api, and file paths", () => {
    for (const path of ["/_next/static/a.js", "/api/users", "/favicon.ico", "/images/a.png"]) {
      const res = middleware(request(path));
      expect(next(res)).toBe("1");
      expect(location(res)).toBeNull();
    }
  });

  it("can skip the cookie and use a custom cookie name", () => {
    const noCookie = createDialexMiddleware({ locales: ["en", "tr"], setCookie: false });
    expect(noCookie(request("/tr")).cookies.get("locale")).toBeUndefined();

    const named = createDialexMiddleware({ locales: ["en", "tr"], cookieName: "NEXT_LOCALE" });
    const res = named(request("/", { cookie: "NEXT_LOCALE=tr" }));
    expect(location(res)).toBe("http://localhost/tr");
  });

  describe("with prefixDefault: false", () => {
    const asNeeded = createDialexMiddleware({
      locales: ["en", "tr"],
      defaultLocale: "en",
      prefixDefault: false,
    });

    it("rewrites default-locale requests internally", () => {
      expect(rewrite(asNeeded(request("/about", { "accept-language": "en" })))).toBe(
        "http://localhost/en/about",
      );
      expect(rewrite(asNeeded(request("/")))).toBe("http://localhost/en");
    });

    it("redirects other locales to their prefix", () => {
      expect(location(asNeeded(request("/about", { "accept-language": "tr" })))).toBe(
        "http://localhost/tr/about",
      );
    });

    it("redirects /en/... back to the canonical unprefixed URL", () => {
      const res = asNeeded(request("/en/about"));
      expect(res.status).toBe(307);
      expect(location(res)).toBe("http://localhost/about");
    });
  });
});
