import { describe, expect, it, vi } from "vite-plus/test";
import { createDialexServer } from "../src/server.js";

const dialex = {
  dictionaries: [
    {
      name: "home",
      dictionary: {
        en: { title: "Welcome", greet: (n: string) => `Hi ${n}` },
        tr: { title: "Hoş Geldiniz", greet: (n: string) => `Selam ${n}` },
      },
    },
  ],
  config: { defaultLocale: "en", locales: ["en", "tr"], fallbacks: { "pt-BR": ["tr"] } },
};

describe("createDialexServer", () => {
  const { getDictionary, getT } = createDialexServer(dialex);

  it("reads a dictionary for a locale and defaults to the configured locale", () => {
    expect((getDictionary("home", "tr") as any).title).toBe("Hoş Geldiniz");
    expect((getDictionary("home") as any).title).toBe("Welcome");
  });

  it("follows configured fallbacks and warns about the locale it used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((getDictionary("home", "pt-BR") as any).title).toBe("Hoş Geldiniz");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('using "tr"'));
    warn.mockRestore();
  });

  it("returns an empty object and warns for an unknown dictionary", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getDictionary("nope")).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope" not found'));
    warn.mockRestore();
  });

  it("builds t() for a locale", () => {
    const t = getT("tr") as any;
    expect(t("home.title")).toBe("Hoş Geldiniz");
    expect(t("home.greet", "Alex")).toBe("Selam Alex");
    expect((getT() as any)("home.title")).toBe("Welcome");
  });

  it("works with a dictionary map as well as definitions", () => {
    const server = createDialexServer({
      dictionaries: { home: dialex.dictionaries[0].dictionary },
      config: dialex.config,
    });
    expect((server.getDictionary("home", "tr") as any).title).toBe("Hoş Geldiniz");
  });

  it("keeps separate sources separate (no module-level registry)", () => {
    const other = createDialexServer({
      dictionaries: [{ name: "home", dictionary: { en: { title: "Other" } } }],
    });
    expect((other.getDictionary("home") as any).title).toBe("Other");
    expect((getDictionary("home") as any).title).toBe("Welcome");
  });
});
