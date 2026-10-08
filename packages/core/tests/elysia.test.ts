import { describe, expect, it } from "vite-plus/test";
import { Elysia } from "elysia";
import { i18n } from "../src/elysia.js";

describe("Elysia integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  const createApp = (options: Parameters<typeof i18n>[0] = {}) =>
    new Elysia()
      .use(i18n({ defaultLocale: "en", dictionaries: [homeDict], ...options }))
      .get("/test", ({ locale, getDictionary }) => ({
        locale,
        title: getDictionary("home").title,
      }))
      .get("/:locale/test", ({ locale }) => ({ locale }))
      .get("/api/users", ({ locale }) => ({ locale }));

  it("detects locale from Accept-Language header", async () => {
    const app = createApp({ locales: ["en", "tr"] });
    const res = await app.handle(
      new Request("http://localhost/test", {
        headers: { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-language")).toBe("tr");
    expect((await res.json()) as any).toEqual({ locale: "tr", title: "Hoş Geldiniz" });
  });

  it("detects locale from URL path", async () => {
    const app = createApp({ locales: ["en", "tr"] });
    const res = await app.handle(
      new Request("http://localhost/tr/test", { headers: { "accept-language": "en" } }),
    );
    expect((await res.json()) as any).toEqual({ locale: "tr" });
  });

  it("detects locale from query parameter and cookie", async () => {
    const app = createApp({ locales: ["en", "tr"] });

    const byQuery = await app.handle(new Request("http://localhost/test?lang=tr"));
    expect(((await byQuery.json()) as any).locale).toBe("tr");

    const byCookie = await app.handle(
      new Request("http://localhost/test", { headers: { cookie: "locale=tr" } }),
    );
    expect(((await byCookie.json()) as any).locale).toBe("tr");
  });

  it("falls back to defaultLocale", async () => {
    const app = createApp({ locales: ["en", "tr"] });
    const res = await app.handle(
      new Request("http://localhost/test", { headers: { "accept-language": "fr" } }),
    );
    expect(((await res.json()) as any).locale).toBe("en");
  });

  it("does not treat the first path segment as a locale when locales is unset", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/users"));
    expect((await res.json()) as any).toEqual({ locale: "en" });
  });

  it("omits Content-Language when setHeader is false", async () => {
    const app = createApp({ setHeader: false });
    const res = await app.handle(new Request("http://localhost/test"));
    expect(res.headers.get("content-language")).toBeNull();
  });

  it("walks fallback chains and exposes t()", async () => {
    const dict = {
      name: "nav",
      dictionary: {
        en: { title: "Home", greet: (n: string) => `Hi ${n}` },
        tr: { title: "Ana Sayfa", greet: (n: string) => `Selam ${n}` },
        es: { title: "Inicio", greet: (n: string) => `Hola ${n}` },
      },
    };
    const app = new Elysia()
      .use(i18n({ defaultLocale: "en", dictionaries: [dict], fallbacks: { pt: ["es"] } }))
      .get("/", ({ t }: any) => ({ title: t("nav.title"), greet: t("nav.greet", "Ada") }));

    const tr = await app.handle(
      new Request("http://localhost/", { headers: { cookie: "locale=tr-TR" } }),
    );
    expect(await tr.json()).toEqual({ title: "Ana Sayfa", greet: "Selam Ada" });

    const pt = await app.handle(
      new Request("http://localhost/", { headers: { cookie: "locale=pt" } }),
    );
    expect(await pt.json()).toEqual({ title: "Inicio", greet: "Hola Ada" });
  });

  it("formats ICU messages through t() using the resolved locale", async () => {
    const dict = {
      name: "cart",
      dictionary: {
        en: { items: "{count, plural, one {# item} other {# items}}" },
        ru: {
          items: "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}",
        },
      },
    };
    const app = new Elysia()
      .use(i18n({ defaultLocale: "en", locales: ["en", "ru"], dictionaries: [dict] }))
      .get("/", ({ t }: any) => ({ text: t("cart.items", { count: 5 }) }));

    const en = await app.handle(new Request("http://localhost/"));
    expect(await en.json()).toEqual({ text: "5 items" });

    const ru = await app.handle(
      new Request("http://localhost/", { headers: { "accept-language": "ru" } }),
    );
    expect(await ru.json()).toEqual({ text: "5 товаров" });
  });
});
