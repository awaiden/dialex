import { describe, expect, it } from "vite-plus/test";
import { i18n } from "../src/astro.js";

describe("Astro integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  const run = async (url: string, headers: Record<string, string> = {}, options = {}) => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
      ...options,
    });
    const context: any = {
      url: new URL(url),
      request: new Request(url, { headers }),
      locals: {},
    };
    const response = await middleware(context, async () => new Response("ok"));
    return { context, response: response as Response };
  };

  it("detects locale from Accept-Language and fills locals", async () => {
    const { context, response } = await run("http://localhost/", {
      "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
    });
    expect(context.locals.locale).toBe("tr");
    expect(context.locals.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(response.headers.get("content-language")).toBe("tr");
  });

  it("detects locale from URL path, query, and cookie", async () => {
    expect((await run("http://localhost/tr/about")).context.locals.locale).toBe("tr");
    expect((await run("http://localhost/?lang=tr")).context.locals.locale).toBe("tr");
    expect((await run("http://localhost/", { cookie: "locale=tr" })).context.locals.locale).toBe(
      "tr",
    );
  });

  it("falls back to defaultLocale", async () => {
    const { context } = await run("http://localhost/", { "accept-language": "fr" });
    expect(context.locals.locale).toBe("en");
  });

  it("does not treat /api as a locale when locales is unset", async () => {
    const { context } = await run("http://localhost/api/users", {}, { locales: undefined });
    expect(context.locals.locale).toBe("en");
  });

  it("omits Content-Language when setHeader is false", async () => {
    const { response } = await run("http://localhost/", {}, { setHeader: false });
    expect(response.headers.get("content-language")).toBeNull();
  });
});
