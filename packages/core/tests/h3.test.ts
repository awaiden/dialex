import { createApp, defineEventHandler, toWebHandler } from "h3";
import { describe, expect, it } from "vite-plus/test";
import { dialex } from "../src/h3.js";

const dict = {
  name: "home",
  dictionary: {
    en: { title: "Welcome", greet: (n: string) => `Hi ${n}` },
    tr: { title: "Hoş Geldiniz", greet: (n: string) => `Selam ${n}` },
  },
};

const handler = (options = {}) => {
  const app = createApp();
  app.use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries: [dict], ...options }));
  app.use(
    defineEventHandler((event) => ({
      locale: event.context.locale,
      title: event.context.getDictionary("home").title,
      greet: (event.context.t as any)("home.greet", "Ada"),
    })),
  );
  const web = toWebHandler(app);
  return (url: string, headers: Record<string, string> = {}) =>
    web(new Request(`http://localhost${url}`, { headers }));
};

describe("h3 integration", () => {
  it("detects locale and fills event.context", async () => {
    const res = await handler()("/", { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-language")).toBe("tr");
    expect(await res.json()).toEqual({ locale: "tr", title: "Hoş Geldiniz", greet: "Selam Ada" });
  });

  it("detects locale from path, query, and cookie", async () => {
    const request = handler();
    expect(((await (await request("/tr/anything")).json()) as any).locale).toBe("tr");
    expect(((await (await request("/?locale=tr")).json()) as any).locale).toBe("tr");
    expect(((await (await request("/", { cookie: "lang=tr" })).json()) as any).locale).toBe("tr");
  });

  it("falls back to the default locale and honors setHeader", async () => {
    const res = await handler({ setHeader: false })("/", { "accept-language": "fr" });
    expect(((await res.json()) as any).locale).toBe("en");
    expect(res.headers.get("content-language")).toBeNull();
  });

  it("does not treat /api as a locale when locales is unset", async () => {
    const res = await handler({ locales: undefined })("/api/users");
    expect(((await res.json()) as any).locale).toBe("en");
  });
});
