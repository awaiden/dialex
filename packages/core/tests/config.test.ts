import { describe, expect, it, vi } from "vite-plus/test";

import { dialex as express } from "../src/express.js";
import { withConfig } from "../src/resolver.js";
import { createDialexHandler } from "../src/web.js";

// The shape `dialex.generated.ts` exports as `dialex`.
const registry = {
  dictionaries: [
    { name: "home", dictionary: { en: { title: "Welcome" }, tr: { title: "Hoş Geldiniz" } } },
  ],
  config: {
    defaultLocale: "tr",
    locales: ["en", "tr"],
    fallbacks: { pt: ["en"] },
    prefixDefault: true,
    lazy: false,
  },
};

describe("generated config in server adapters", () => {
  it("fills defaultLocale, locales and fallbacks from config", () => {
    expect(withConfig({ config: registry.config })).toMatchObject({
      defaultLocale: "tr",
      locales: ["en", "tr"],
      fallbacks: { pt: ["en"] },
    });
  });

  it("lets explicit options override the config", () => {
    const merged = withConfig({ config: registry.config, defaultLocale: "en", locales: ["en"] });
    expect(merged.defaultLocale).toBe("en");
    expect(merged.locales).toEqual(["en"]);
  });

  it("express: {...dialex} uses the configured default locale", () => {
    const middleware = express({ ...registry });
    const req: any = { headers: {}, query: {} };
    const res: any = { locals: {}, setHeader: vi.fn() };
    middleware(req, res, vi.fn());

    expect(req.locale).toBe("tr");
    expect(req.getDictionary("home").title).toBe("Hoş Geldiniz");
  });

  it("web: {...dialex} uses the configured default locale and fallbacks", async () => {
    const handle = createDialexHandler({ ...registry });
    const { locale, getDictionary } = await handle(new Request("https://example.com/"));

    expect(locale).toBe("tr");
    expect((getDictionary("home") as { title: string }).title).toBe("Hoş Geldiniz");
  });
});
