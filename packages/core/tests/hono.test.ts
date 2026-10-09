import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";

import { dialex } from "../src/hono.js";

describe("Hono integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  it("detects locale from Accept-Language header", async () => {
    const app = new Hono();
    app.use(
      "*",
      dialex({
        defaultLocale: "en",
        locales: ["en", "tr"],
        dictionaries: [homeDict],
      }),
    );

    app.get("/test", (c) => {
      const dict = c.var.getDictionary("home");
      return c.json({ locale: c.var.locale, title: dict.title });
    });

    const res = await app.request("http://localhost/test", {
      headers: { "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Language")).toBe("tr");
    const json: any = await res.json();
    expect(json.locale).toBe("tr");
    expect(json.title).toBe("Hoş Geldiniz");
  });

  it("prioritizes query parameters over header", async () => {
    const app = new Hono();
    app.use(
      "*",
      dialex({
        defaultLocale: "en",
        locales: ["en", "tr"],
        dictionaries: [homeDict],
      }),
    );

    app.get("/test", (c) => {
      const dict = c.var.getDictionary("home");
      return c.json({ locale: c.var.locale, title: dict.title });
    });

    const res = await app.request("http://localhost/test?locale=tr", {
      headers: { "Accept-Language": "en" },
    });

    const json: any = await res.json();
    expect(json.locale).toBe("tr");
    expect(json.title).toBe("Hoş Geldiniz");
  });

  it("falls back to defaultLocale", async () => {
    const app = new Hono();
    app.use(
      "*",
      dialex({
        defaultLocale: "en",
        locales: ["en", "tr"],
        dictionaries: [homeDict],
      }),
    );

    app.get("/test", (c) => {
      const dict = c.var.getDictionary("home");
      return c.json({ locale: c.var.locale, title: dict.title });
    });

    const res = await app.request("http://localhost/test");
    const json: any = await res.json();
    expect(json.locale).toBe("en");
    expect(json.title).toBe("Welcome");
  });
});
