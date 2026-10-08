import { describe, expect, it } from "vite-plus/test";
import { createI18nHandler } from "../src/web.js";

const dict = {
  name: "home",
  dictionary: {
    en: { title: "Welcome", greet: (n: string) => `Hi ${n}` },
    tr: { title: "Hoş Geldiniz", greet: (n: string) => `Selam ${n}` },
  },
};

const make = (options = {}) =>
  createI18nHandler({
    defaultLocale: "en",
    locales: ["en", "tr"],
    dictionaries: [dict],
    ...options,
  });
const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { headers });

describe("createI18nHandler", () => {
  it("detects the locale from path, query, cookie, then Accept-Language", async () => {
    const resolve = make();
    expect((await resolve(req("/tr/x", { "accept-language": "en" }))).locale).toBe("tr");
    expect((await resolve(req("/x?lang=tr"))).locale).toBe("tr");
    expect((await resolve(req("/x", { cookie: "locale=tr" }))).locale).toBe("tr");
    expect((await resolve(req("/x", { "accept-language": "tr-TR,tr;q=0.9" }))).locale).toBe("tr");
    expect((await resolve(req("/x", { "accept-language": "fr" }))).locale).toBe("en");
  });

  it("returns dictionaries, t(), and headers", async () => {
    const i18n = await make()(req("/", { "accept-language": "tr" }));
    expect(i18n.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect((i18n.t as any)("home.greet", "Ada")).toBe("Selam Ada");
    expect(i18n.headers).toEqual({ "Content-Language": "tr" });
  });

  it("applies headers to mutable and immutable responses", async () => {
    const i18n = await make()(req("/", { "accept-language": "tr" }));

    const plain = new Response("ok");
    expect(i18n.applyHeaders(plain).headers.get("content-language")).toBe("tr");

    const redirect = Response.redirect("http://localhost/elsewhere", 302);
    const patched = i18n.applyHeaders(redirect);
    expect(patched.headers.get("content-language")).toBe("tr");
    expect(patched.headers.get("location")).toBe("http://localhost/elsewhere");
    expect(patched.status).toBe(302);
  });

  it("honors setHeader: false, fallbacks, custom, and the unset-locales path rule", async () => {
    expect((await make({ setHeader: false })(req("/"))).headers).toEqual({});

    const fallback = make({ locales: ["en", "tr", "es"], fallbacks: { pt: ["es"] } });
    expect((await fallback(req("/", { cookie: "locale=tr" }))).locale).toBe("tr");

    const custom = make({ custom: (r: Request) => r.headers.get("x-locale") });
    expect((await custom(req("/", { "x-locale": "tr" }))).locale).toBe("tr");

    const noLocales = make({ locales: undefined });
    expect((await noLocales(req("/api/users"))).locale).toBe("en");
  });
});
