import { describe, expect, it } from "vite-plus/test";
import Fastify from "fastify";
import { dialexPlugin } from "../src/fastify.js";

describe("Fastify integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  it("detects locale from Accept-Language header", async () => {
    const app = Fastify();
    await app.register(dialexPlugin, {
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    app.get("/test", async (req) => {
      const dict = req.getDictionary("home");
      return { locale: req.locale, title: dict.title };
    });

    const res = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-language"]).toBe("tr");
    const json = res.json();
    expect(json.locale).toBe("tr");
    expect(json.title).toBe("Hoş Geldiniz");
  });

  it("detects locale from URL path", async () => {
    const app = Fastify();
    await app.register(dialexPlugin, {
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    app.get("/:locale/test", async (req) => {
      const dict = req.getDictionary("home");
      return { locale: req.locale, title: dict.title };
    });

    const res = await app.inject({
      method: "GET",
      url: "/tr/test",
      headers: { "accept-language": "en" },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.locale).toBe("tr");
    expect(json.title).toBe("Hoş Geldiniz");
  });

  it("falls back to defaultLocale", async () => {
    const app = Fastify();
    await app.register(dialexPlugin, {
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    app.get("/test", async (req) => {
      const dict = req.getDictionary("home");
      return { locale: req.locale, title: dict.title };
    });

    const res = await app.inject({
      method: "GET",
      url: "/test",
    });

    const json = res.json();
    expect(json.locale).toBe("en");
    expect(json.title).toBe("Welcome");
  });

  it("detects locale from URL path when a query string is present", async () => {
    const app = Fastify();
    await app.register(dialexPlugin, {
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });
    app.get("/:locale", async (req) => ({ locale: req.locale }));

    const res = await app.inject({
      method: "GET",
      url: "/tr?x=1",
      headers: { "accept-language": "en" },
    });
    expect(res.json().locale).toBe("tr");
  });

  it("does not treat the first path segment as a locale when locales is unset", async () => {
    const app = Fastify();
    await app.register(dialexPlugin, { defaultLocale: "en", dictionaries: [homeDict] });
    app.get("/api/users", async (req) => ({ locale: req.locale }));

    const res = await app.inject({ method: "GET", url: "/api/users" });
    expect(res.json().locale).toBe("en");
    expect(res.headers["content-language"]).toBe("en");
  });
});
