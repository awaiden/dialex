import { describe, expect, it, vi } from "vite-plus/test";

import { createDialexMiddleware } from "../../src/server/adonis.js";

const home = {
  name: "home",
  dictionary: { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } },
};

function context(parts: {
  url?: string;
  qs?: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const headers = parts.headers ?? {};
  return {
    request: {
      url: () => parts.url ?? "/",
      qs: () => parts.qs ?? {},
      header: (name: string) => headers[name.toLowerCase()],
    },
    response: { header: vi.fn() },
  } as any;
}

async function run(options: Record<string, unknown>, ctx: any) {
  const Middleware = createDialexMiddleware({
    defaultLocale: "en",
    locales: ["en", "tr"],
    dictionaries: [home],
    ...options,
  });
  const next = vi.fn(async () => "done");
  const result = await new Middleware().handle(ctx, next);
  return { result, next };
}

describe("AdonisJS integration", () => {
  it("detects the locale from Accept-Language and calls next", async () => {
    const ctx = context({ headers: { "accept-language": "tr-TR,tr;q=0.9" } });
    const { result, next } = await run({}, ctx);

    expect(next).toHaveBeenCalled();
    expect(result).toBe("done");
    expect(ctx.locale).toBe("tr");
    expect(ctx.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(ctx.response.header).toHaveBeenCalledWith("Content-Language", "tr");
  });

  it("prefers the URL path, then the query string, then the cookie", async () => {
    const byPath = context({ url: "/tr/hello", headers: { "accept-language": "en" } });
    await run({}, byPath);
    expect(byPath.locale).toBe("tr");

    const byQuery = context({ url: "/hello", qs: { lang: "tr" } });
    await run({}, byQuery);
    expect(byQuery.locale).toBe("tr");

    const byCookie = context({ headers: { cookie: "locale=tr" } });
    await run({}, byCookie);
    expect(byCookie.locale).toBe("tr");
  });

  it("falls back to the default locale", async () => {
    const ctx = context({ headers: { "accept-language": "fr" } });
    await run({}, ctx);
    expect(ctx.locale).toBe("en");
    expect(ctx.getDictionary("home").title).toBe("Welcome");
  });

  it("omits Content-Language when setHeader is false", async () => {
    const ctx = context({ headers: { "accept-language": "tr" } });
    await run({ setHeader: false }, ctx);
    expect(ctx.response.header).not.toHaveBeenCalled();
  });

  it("supports a custom extractor", async () => {
    const ctx = context({ headers: { "accept-language": "en" } });
    await run({ custom: () => "tr" }, ctx);
    expect(ctx.locale).toBe("tr");
  });
});
