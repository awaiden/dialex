import { describe, expect, it } from "vite-plus/test";

import {
  parseAcceptLanguage,
  matchLocale,
  extractCookieLocale,
  extractPathLocale,
  resolveLocaleFromCandidates,
  lookupLocale,
  resolveFallbackChain,
} from "../../src/core/resolver.js";

describe("resolver utilities", () => {
  describe("extractPathLocale", () => {
    it("extracts supported locale from path", () => {
      expect(extractPathLocale("/tr/greet", ["en", "tr"])).toBe("tr");
      expect(extractPathLocale("/en/dashboard", ["en", "tr"])).toBe("en");
      expect(extractPathLocale("/es/dashboard", ["en", "tr"])).toBeUndefined();
      expect(extractPathLocale("/", ["en", "tr"])).toBeUndefined();
    });

    it("ignores the path when no locales are configured", () => {
      expect(extractPathLocale("/api/users")).toBeUndefined();
      expect(extractPathLocale("/api/users", [])).toBeUndefined();
    });

    it("ignores query strings and fragments", () => {
      expect(extractPathLocale("/tr?x=1", ["en", "tr"])).toBe("tr");
      expect(extractPathLocale("/tr/page#top", ["en", "tr"])).toBe("tr");
      expect(extractPathLocale("/?lang=tr", ["en", "tr"])).toBeUndefined();
    });
  });

  describe("parseAcceptLanguage", () => {
    it("parses single language", () => {
      expect(parseAcceptLanguage("en")).toEqual(["en"]);
    });

    it("sorts by quality factors", () => {
      expect(parseAcceptLanguage("en;q=0.8, tr;q=0.9, fr;q=0.5")).toEqual(["tr", "en", "fr"]);
    });

    it("defaults q to 1.0", () => {
      expect(parseAcceptLanguage("de, en;q=0.9")).toEqual(["de", "en"]);
    });

    it("ignores wildcards and invalid headers", () => {
      expect(parseAcceptLanguage("*")).toEqual([]);
      expect(parseAcceptLanguage("fr;q=0, en")).toEqual(["en"]);
      expect(parseAcceptLanguage("fr;q=0")).toEqual([]);
      expect(parseAcceptLanguage("")).toEqual([]);
      expect(parseAcceptLanguage(undefined)).toEqual([]);
    });
  });

  describe("matchLocale", () => {
    it("matches exact case-insensitively", () => {
      expect(matchLocale("TR", ["en", "tr"])).toBe("tr");
      expect(matchLocale("en", ["en", "tr"])).toBe("en");
    });

    it("matches regional candidate against base supported locale", () => {
      expect(matchLocale("en-US", ["en", "tr"])).toBe("en");
      expect(matchLocale("tr-TR", ["en", "tr"])).toBe("tr");
    });

    it("matches base candidate against regional supported locale", () => {
      expect(matchLocale("en", ["en-US", "tr-TR"])).toBe("en-US");
    });

    it("returns undefined for unsupported locales", () => {
      expect(matchLocale("de", ["en", "tr"])).toBeUndefined();
    });
  });

  describe("extractCookieLocale", () => {
    it("extracts from cookie header string", () => {
      expect(extractCookieLocale("session=123; locale=tr", ["locale"])).toBe("tr");
      expect(extractCookieLocale("lang=en; other=abc", ["locale", "lang"])).toBe("en");
    });

    it("returns undefined when key not present", () => {
      expect(extractCookieLocale("session=123", ["locale"])).toBeUndefined();
      expect(() => extractCookieLocale("locale=%E0%A4%A", ["locale"])).not.toThrow();
      expect(extractCookieLocale("locale=%E0%A4%A", ["locale"])).toBe("%E0%A4%A");
    });
  });

  describe("resolveLocaleFromCandidates", () => {
    it("resolves the first matching candidate", () => {
      const candidates = ["de", "tr-TR", "en"];
      const resolved = resolveLocaleFromCandidates(candidates, ["en", "tr"], "en");
      expect(resolved).toBe("tr");
    });

    it("falls back to defaultLocale when no candidate matches", () => {
      const candidates = ["fr", "es"];
      const resolved = resolveLocaleFromCandidates(candidates, ["en", "tr"], "en");
      expect(resolved).toBe("en");
    });
  });
});

describe("lookupLocale fast path", () => {
  it("returns the exact locale without consulting fallbacks", () => {
    const dictionary = { en: "Hello", "tr-TR": "Merhaba (TR)", tr: "Merhaba" };
    const options = { fallbacks: { "tr-TR": ["en"] }, defaultLocale: "en" };
    expect(lookupLocale(dictionary, "tr-TR", options)).toEqual({
      content: "Merhaba (TR)",
      locale: "tr-TR",
    });
  });

  it("still walks the chain when the exact locale is missing", () => {
    const dictionary = { en: "Hello", tr: "Merhaba" };
    expect(lookupLocale(dictionary, "tr-TR", { defaultLocale: "en" })).toEqual({
      content: "Merhaba",
      locale: "tr",
    });
    expect(lookupLocale(dictionary, "fr", { defaultLocale: "en" })).toEqual({
      content: "Hello",
      locale: "en",
    });
    expect(lookupLocale(dictionary, undefined, { defaultLocale: "tr" })).toEqual({
      content: "Merhaba",
      locale: "tr",
    });
  });
});

describe("lookupLocale against the plain fallback-chain walk", () => {
  const reference = (
    dictionary: Record<string, string>,
    locale: string | null | undefined,
    options: { fallbacks?: Record<string, string[]>; defaultLocale?: string },
  ) => {
    for (const candidate of resolveFallbackChain(locale, options)) {
      if (dictionary[candidate] !== undefined)
        return { content: dictionary[candidate], locale: candidate };
    }
    const first = Object.keys(dictionary)[0];
    return first !== undefined ? { content: dictionary[first], locale: first } : undefined;
  };

  it("returns the same result for every combination", () => {
    const dictionaries: Record<string, string>[] = [
      {},
      { en: "e" },
      { tr: "t", en: "e" },
      { "tr-TR": "tt", tr: "t" },
      { pt: "p", es: "s" },
      { "pt-BR": "pb", en: "e" },
    ];
    const locales = ["en", "tr", "tr-TR", "pt-BR", "pt", "fr", "zh-Hans-CN", "", null, undefined];
    const optionSets = [
      {},
      { defaultLocale: "en" },
      { defaultLocale: "tr" },
      { defaultLocale: "en", fallbacks: { "pt-BR": ["es"], fr: ["en"], "tr-TR": ["en"] } },
    ];
    for (const dictionary of dictionaries) {
      for (const locale of locales) {
        for (const options of optionSets) {
          expect(lookupLocale(dictionary, locale, options)).toEqual(
            reference(dictionary, locale, options),
          );
        }
      }
    }
  });
});
