import { describe, expect, it } from "vite-plus/test";
import { createTestI18n, mockRequest } from "../src/testing/index.js";
import { createI18nHandler } from "../src/web.js";

const home = {
  name: "home",
  dictionary: {
    en: { title: "Welcome", greet: (n: string) => `Hi ${n}` },
    tr: { title: "Hoş Geldiniz", greet: (n: string) => `Selam ${n}` },
    es: { title: "Bienvenido", greet: (n: string) => `Hola ${n}` },
  },
};

describe("createTestI18n", () => {
  it("serves dictionaries and t() for a locale", () => {
    const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });
    expect(i18n.locale).toBe("tr");
    expect(i18n.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect((i18n.t as any)("home.greet", "Ada")).toBe("Selam Ada");
  });

  it("defaults to the default locale and accepts a dictionary map", () => {
    const i18n = createTestI18n({ dictionaries: { home: home.dictionary } });
    expect(i18n.locale).toBe("en");
    expect(i18n.getDictionary("home").title).toBe("Welcome");
  });

  it("switches locale without mutating the original", () => {
    const en = createTestI18n({ dictionaries: [home] });
    const tr = en.withLocale("tr");
    expect(tr.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(en.getDictionary("home").title).toBe("Welcome");
    expect(tr.withLocale("en").locale).toBe("en");
  });

  it("follows fallbacks and subtag truncation", () => {
    const chain = createTestI18n({ dictionaries: [home], locale: "pt", fallbacks: { pt: ["es"] } });
    expect(chain.getDictionary("home").title).toBe("Bienvenido");
    expect(
      createTestI18n({ dictionaries: [home], locale: "tr-TR" }).getDictionary("home").title,
    ).toBe("Hoş Geldiniz");
  });
});

describe("mockRequest", () => {
  const resolve = createI18nHandler({ locales: ["en", "tr"], dictionaries: [home] });
  const localeOf = async (request: Request) => (await resolve(request)).locale;

  it("resolves to the requested locale through each mechanism", async () => {
    for (const via of ["header", "cookie", "query", "path"] as const) {
      expect(await localeOf(mockRequest("/dashboard", { locale: "tr", via }))).toBe("tr");
    }
  });

  it("builds a plain request when no locale is given", async () => {
    const request = mockRequest("/x");
    expect(request.url).toBe("http://localhost/x");
    expect(request.method).toBe("GET");
    expect(await localeOf(request)).toBe("en");
  });

  it("merges headers and cookies, and supports methods and bodies", async () => {
    const request = mockRequest("/api/save?draft=1", {
      locale: "tr",
      via: "cookie",
      cookies: { session: "a b" },
      headers: { "x-test": "1" },
      method: "POST",
      body: "{}",
    });
    expect(request.method).toBe("POST");
    expect(request.headers.get("x-test")).toBe("1");
    expect(request.headers.get("cookie")).toBe("session=a%20b; locale=tr");
    expect(new URL(request.url).search).toBe("?draft=1");
    expect(await request.text()).toBe("{}");
  });

  it("puts the locale in front of the path, including the root", () => {
    expect(new URL(mockRequest("/a/b", { locale: "tr", via: "path" }).url).pathname).toBe(
      "/tr/a/b",
    );
    expect(new URL(mockRequest("/", { locale: "tr", via: "path" }).url).pathname).toBe("/tr");
  });
});
