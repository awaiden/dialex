import { describe, expect, it } from "vite-plus/test";

import { createGetDictionary, normalizeDictionaries, resolveRequestLocale } from "../src/shared.js";

describe("shared adapter helpers", () => {
  const home = { name: "home", dictionary: { en: { t: "Hi" }, tr: { t: "Selam" } } };

  it("normalizes arrays of definitions and passes maps through", () => {
    expect(normalizeDictionaries([home])).toEqual({ home: home.dictionary });
    const map = { home: home.dictionary };
    expect(normalizeDictionaries(map)).toBe(map);
    expect(normalizeDictionaries(undefined)).toBeUndefined();
  });

  it("getDictionary returns locale content and falls back to the default locale", () => {
    const customDictMap = normalizeDictionaries([home]);
    const tr = createGetDictionary({ customDictMap, locale: "tr", defaultLocale: "en", tag: "t" });
    expect(tr<{ t: string }>("home").t).toBe("Selam");

    const fr = createGetDictionary({ customDictMap, locale: "fr", defaultLocale: "en", tag: "t" });
    expect(fr<{ t: string }>("home").t).toBe("Hi");
    expect(fr("missing")).toEqual({});
  });

  it("resolves candidates in order: custom, path, query, cookie, header", () => {
    const options = { locales: ["en", "tr", "de"], defaultLocale: "en" };
    expect(
      resolveRequestLocale(options, { custom: "de", pathname: "/tr", acceptLanguage: "en" }),
    ).toBe("de");
    expect(resolveRequestLocale(options, { pathname: "/tr", query: () => "de" })).toBe("tr");
    expect(resolveRequestLocale(options, { query: () => "de", cookieHeader: "locale=tr" })).toBe(
      "de",
    );
    expect(resolveRequestLocale(options, { cookieHeader: "locale=tr", acceptLanguage: "de" })).toBe(
      "tr",
    );
    expect(resolveRequestLocale(options, { acceptLanguage: "de;q=0.5, tr" })).toBe("tr");
    expect(resolveRequestLocale(options, {})).toBe("en");
  });
});
