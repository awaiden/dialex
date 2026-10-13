import { describe, expect, it } from "vite-plus/test";

import { createDialexContext } from "../../src/server/trpc.js";

const home = {
  name: "home",
  dictionary: {
    en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
    tr: { title: "Hoş Geldiniz", items: "{count, plural, other {# ürün}}" },
  },
};

const resolve = createDialexContext({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries: [home],
});

describe("tRPC integration", () => {
  it("reads a Fetch Request", () => {
    const ctx = resolve(
      new Request("http://localhost/trpc/greet", { headers: { "accept-language": "tr" } }),
    );
    expect(ctx.locale).toBe("tr");
    expect((ctx.getDictionary("home") as { title: string }).title).toBe("Hoş Geldiniz");
  });

  it("reads Node-style headers and a path", () => {
    const ctx = resolve({ headers: { cookie: "locale=tr" }, url: "/trpc/greet" });
    expect(ctx.locale).toBe("tr");
  });

  it("reads the locale from the query string", () => {
    const ctx = resolve({ headers: {}, url: "/trpc/greet?lang=tr" });
    expect(ctx.locale).toBe("tr");
  });

  it("falls back to the default locale", () => {
    expect(resolve({ headers: { "accept-language": "fr" } }).locale).toBe("en");
    expect(resolve({ headers: {} }).locale).toBe("en");
  });

  it("offers t() bound to the locale", () => {
    const ctx = resolve({ headers: { "accept-language": "tr" } });
    expect((ctx.t as any)("home.items", { count: 3 })).toBe("3 ürün");
  });

  it("ignores a malformed url", () => {
    expect(() => resolve({ headers: {}, url: "http://[" })).not.toThrow();
  });
});
