import { describe, expect, it } from "vite-plus/test";

import {
  alternateLanguages,
  alternateLinks,
  localizePath,
  sitemapEntries,
  stripLocale,
} from "../src/routing.js";

const locales = ["en", "tr", "pt-BR"];

describe("stripLocale", () => {
  it("removes an exact locale prefix and reports it", () => {
    expect(stripLocale("/tr/about", locales)).toEqual({ path: "/about", locale: "tr" });
    expect(stripLocale("/tr", locales)).toEqual({ path: "/", locale: "tr" });
    expect(stripLocale("/PT-br/a/?x=1#h", locales)).toEqual({ path: "/a/?x=1#h", locale: "pt-BR" });
  });

  it("leaves other paths alone", () => {
    expect(stripLocale("/about", locales)).toEqual({ path: "/about" });
    expect(stripLocale("/english/about", locales)).toEqual({ path: "/english/about" });
    expect(stripLocale("/", locales)).toEqual({ path: "/" });
  });
});

describe("localizePath", () => {
  const opts = { locales, defaultLocale: "en" };

  it("prefixes paths and preserves query strings and fragments", () => {
    expect(localizePath("/about", "tr", opts)).toBe("/tr/about");
    expect(localizePath("/", "tr", opts)).toBe("/tr");
    expect(localizePath("about", "tr", opts)).toBe("/tr/about");
    expect(localizePath("/a?x=1#top", "tr", opts)).toBe("/tr/a?x=1#top");
  });

  it("replaces an existing locale prefix", () => {
    expect(localizePath("/en/about", "tr", opts)).toBe("/tr/about");
    expect(localizePath("/tr", "pt-BR", opts)).toBe("/pt-BR");
  });

  it("omits the prefix for the default locale when prefixDefault is false", () => {
    const asNeeded = { ...opts, prefixDefault: false };
    expect(localizePath("/about", "en", asNeeded)).toBe("/about");
    expect(localizePath("/tr/about", "en", asNeeded)).toBe("/about");
    expect(localizePath("/", "en", asNeeded)).toBe("/");
    expect(localizePath("/about", "tr", asNeeded)).toBe("/tr/about");
  });

  it("returns external URLs and fragments unchanged", () => {
    for (const href of [
      "https://example.com/a",
      "//cdn.example.com/x",
      "mailto:a@b.c",
      "#section",
    ]) {
      expect(localizePath(href, "tr", opts)).toBe(href);
    }
  });
});

describe("alternates and sitemap", () => {
  const opts = { locales: ["en", "tr"], defaultLocale: "en", baseUrl: "https://example.com/" };

  it("builds hreflang links with x-default", () => {
    expect(alternateLinks("/about", opts)).toEqual([
      { locale: "en", href: "https://example.com/en/about" },
      { locale: "tr", href: "https://example.com/tr/about" },
      { locale: "x-default", href: "https://example.com/en/about" },
    ]);
    expect(alternateLinks("/about", { ...opts, xDefault: false })).toHaveLength(2);
  });

  it("points x-default at the unprefixed path when the default locale is unprefixed", () => {
    expect(alternateLanguages("/about", { ...opts, prefixDefault: false })).toEqual({
      en: "https://example.com/about",
      tr: "https://example.com/tr/about",
      "x-default": "https://example.com/about",
    });
  });

  it("creates one sitemap entry per path and locale", () => {
    const entries = sitemapEntries(["/", "/about"], { ...opts, lastModified: "2024-01-01" });
    expect(entries.map((e) => e.url)).toEqual([
      "https://example.com/en",
      "https://example.com/tr",
      "https://example.com/en/about",
      "https://example.com/tr/about",
    ]);
    expect(entries[2]).toMatchObject({
      lastModified: "2024-01-01",
      alternates: {
        languages: { en: "https://example.com/en/about", tr: "https://example.com/tr/about" },
      },
    });
  });
});
