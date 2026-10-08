import { describe, expect, it, vi } from "vite-plus/test";
import { i18n } from "../src/koa.js";

describe("Koa integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  it("detects locale from Accept-Language header", async () => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const ctx: any = {
      path: "/test",
      query: {},
      headers: { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" },
      set: vi.fn(),
    };
    const next = vi.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.locale).toBe("tr");
    expect(ctx.set).toHaveBeenCalledWith("Content-Language", "tr");

    const dict = ctx.getDictionary("home");
    expect(dict.title).toBe("Hoş Geldiniz");
  });

  it("detects locale from URL path", async () => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const ctx: any = {
      path: "/tr/greet",
      query: {},
      headers: { "accept-language": "en" },
      set: vi.fn(),
    };
    const next = vi.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.locale).toBe("tr");
    expect(ctx.getDictionary("home").title).toBe("Hoş Geldiniz");
  });

  it("falls back to defaultLocale", async () => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const ctx: any = {
      path: "/test",
      query: {},
      headers: {},
      set: vi.fn(),
    };
    const next = vi.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.locale).toBe("en");
    expect(ctx.getDictionary("home").title).toBe("Welcome");
  });
});
