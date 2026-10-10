import { get } from "svelte/store";
import { describe, expect, it, vi } from "vite-plus/test";

import { createSvelteDialex } from "../src/svelte.js";

const dictionaries = [
  {
    name: "home",
    dictionary: {
      en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
      tr: { title: "Hoş Geldiniz", items: "{count, plural, one {# ürün} other {# ürün}}" },
    },
  },
];
const config = { defaultLocale: "en", locales: ["en", "tr"], fallbacks: {}, prefixDefault: true };

describe("createSvelteDialex", () => {
  it("starts in the configured default locale", () => {
    const dialex = createSvelteDialex({ dictionaries, config }, { persist: false });
    expect(get(dialex.locale)).toBe("en");
    expect(get(dialex.dictionary("home")).title).toBe("Welcome");
  });

  it("follows setLocale in dictionary and translator stores", () => {
    const dialex = createSvelteDialex({ dictionaries, config }, { persist: false });
    const home = dialex.dictionary("home");
    const t = dialex.translator("home");
    const seen: string[] = [];
    const stop = home.subscribe((value: any) => seen.push(value.title));

    dialex.setLocale("tr");

    expect(get(dialex.locale)).toBe("tr");
    expect(get(home).title).toBe("Hoş Geldiniz");
    expect(get(t)("home.items", { count: 2 })).toBe("2 ürün");
    expect(seen).toEqual(["Welcome", "Hoş Geldiniz"]);
    stop();
  });

  it("prefers initialLocale, then defaultLocale, then the config", () => {
    expect(
      get(
        createSvelteDialex(
          { dictionaries, config },
          { persist: false, initialLocale: "tr", defaultLocale: "en" },
        ).locale,
      ),
    ).toBe("tr");
    expect(
      get(
        createSvelteDialex({ dictionaries, config }, { persist: false, defaultLocale: "tr" })
          .locale,
      ),
    ).toBe("tr");
    expect(get(createSvelteDialex({ dictionaries }, { persist: false }).locale)).toBe("en");
  });

  it("calls onLocaleChange and does not expose a writable locale", () => {
    const onLocaleChange = vi.fn();
    const dialex = createSvelteDialex({ dictionaries, config }, { persist: false, onLocaleChange });
    dialex.setLocale("tr");
    expect(onLocaleChange).toHaveBeenCalledWith("tr");
    expect((dialex.locale as any).set).toBeUndefined();
  });

  it("falls back through the locale chain for a missing locale", () => {
    const dialex = createSvelteDialex({ dictionaries, config }, { persist: false });
    dialex.setLocale("de");
    expect(get(dialex.dictionary("home")).title).toBe("Welcome");
  });

  it("loads lazy dictionaries on demand and updates subscribers", async () => {
    const loaders = {
      home: () => Promise.resolve({ default: dictionaries[0] }),
    };
    const dialex = createSvelteDialex({ config, loaders }, { persist: false });
    const home = dialex.dictionary("home");

    const titles: unknown[] = [];
    const stop = home.subscribe((value: any) => titles.push(value.title));
    expect(titles[0]).toBeUndefined(); // not loaded yet, and no warning

    await vi.waitFor(() => expect(titles.at(-1)).toBe("Welcome"));
    stop();
  });
});
