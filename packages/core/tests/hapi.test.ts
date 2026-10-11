import Hapi from "@hapi/hapi";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { dialexPlugin } from "../src/hapi.js";

const home = {
  name: "home",
  dictionary: { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } },
};

let server: Hapi.Server;

async function start(options: Record<string, unknown> = {}) {
  server = Hapi.server();
  await server.register({
    plugin: dialexPlugin,
    options: { defaultLocale: "en", locales: ["en", "tr"], dictionaries: [home], ...options },
  });
  server.route({
    method: "GET",
    path: "/{any*}",
    handler: (request) => ({
      locale: request.locale,
      title: (request.getDictionary("home") as { title: string }).title,
    }),
  });
  return server;
}

afterEach(async () => {
  await server?.stop();
});

describe("Hapi integration", () => {
  it("detects the locale from Accept-Language and sets Content-Language", async () => {
    await start();
    const res = await server.inject({
      url: "/hello",
      headers: { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" },
    });
    expect(JSON.parse(res.payload)).toEqual({ locale: "tr", title: "Hoş Geldiniz" });
    expect(res.headers["content-language"]).toBe("tr");
  });

  it("prefers the URL path over the header", async () => {
    await start();
    const res = await server.inject({ url: "/tr/hello", headers: { "accept-language": "en" } });
    expect(JSON.parse(res.payload).locale).toBe("tr");
  });

  it("reads the query string and the cookie", async () => {
    await start();
    const query = await server.inject({ url: "/x?lang=tr" });
    expect(JSON.parse(query.payload).locale).toBe("tr");

    const cookie = await server.inject({ url: "/x", headers: { cookie: "locale=tr" } });
    expect(JSON.parse(cookie.payload).locale).toBe("tr");
  });

  it("falls back to the default locale", async () => {
    await start();
    const res = await server.inject({ url: "/x", headers: { "accept-language": "fr" } });
    expect(JSON.parse(res.payload)).toEqual({ locale: "en", title: "Welcome" });
  });

  it("keeps requests apart", async () => {
    await start();
    const [a, b] = await Promise.all([
      server.inject({ url: "/x", headers: { "accept-language": "tr" } }),
      server.inject({ url: "/x", headers: { "accept-language": "en" } }),
    ]);
    expect(JSON.parse(a.payload).locale).toBe("tr");
    expect(JSON.parse(b.payload).locale).toBe("en");
  });

  it("omits Content-Language when setHeader is false", async () => {
    await start({ setHeader: false });
    const res = await server.inject({ url: "/x", headers: { "accept-language": "tr" } });
    expect(res.headers["content-language"]).toBeUndefined();
  });

  it("sets Content-Language on error responses too", async () => {
    await start();
    server.route({
      method: "GET",
      path: "/boom",
      handler: () => {
        throw new Error("nope");
      },
    });
    const res = await server.inject({ url: "/boom", headers: { "accept-language": "tr" } });
    expect(res.statusCode).toBe(500);
    expect(res.headers["content-language"]).toBe("tr");
  });
});
