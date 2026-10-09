import { describe, expect, it } from "vite-plus/test";
import { dialexHandle } from "../src/sveltekit.js";

describe("SvelteKit integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  const run = async (url: string, headers: Record<string, string> = {}, options = {}) => {
    const handle = dialexHandle({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
      ...options,
    });
    const event: any = {
      url: new URL(url),
      request: new Request(url, { headers }),
      locals: {},
    };
    let html = "";
    const response = await handle({
      event,
      resolve: async (_event: any, opts: any) => {
        html = opts.transformPageChunk({ html: '<html lang="%dialex.lang%">', done: true });
        return new Response(html);
      },
    } as any);
    return { event, response, html };
  };

  it("detects locale from Accept-Language and fills locals", async () => {
    const { event, response } = await run("http://localhost/", {
      "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
    });
    expect(event.locals.locale).toBe("tr");
    expect(event.locals.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(response.headers.get("content-language")).toBe("tr");
  });

  it("replaces the lang placeholder in the HTML", async () => {
    const { html } = await run("http://localhost/tr/about");
    expect(html).toBe('<html lang="tr">');
  });

  it("detects locale from query and cookie", async () => {
    expect((await run("http://localhost/?locale=tr")).event.locals.locale).toBe("tr");
    expect((await run("http://localhost/", { cookie: "lang=tr" })).event.locals.locale).toBe("tr");
  });

  it("does not treat /api as a locale when locales is unset", async () => {
    const { event } = await run("http://localhost/api/users", {}, { locales: undefined });
    expect(event.locals.locale).toBe("en");
  });

  it("omits Content-Language when setHeader is false", async () => {
    const { response } = await run("http://localhost/", {}, { setHeader: false });
    expect(response.headers.get("content-language")).toBeNull();
  });
});
