import { describe, expect, it, vi } from "vite-plus/test";

import { lookupLocale, resolveFallbackChain } from "../src/resolver.js";
import { createGetDictionary } from "../src/shared.js";

describe("resolveFallbackChain", () => {
  it("truncates region subtags and ends with the default locale", () => {
    expect(resolveFallbackChain("tr-TR", { defaultLocale: "en" })).toEqual(["tr-TR", "tr", "en"]);
    expect(resolveFallbackChain("zh-Hant-TW", { defaultLocale: "en" })).toEqual([
      "zh-Hant-TW",
      "zh-Hant",
      "zh",
      "en",
    ]);
  });

  it("puts explicit fallbacks before truncations of the default", () => {
    expect(
      resolveFallbackChain("pt-BR", { fallbacks: { "pt-BR": ["es-ES"] }, defaultLocale: "en" }),
    ).toEqual(["pt-BR", "es-ES", "pt", "es", "en"]);
  });

  it("de-duplicates and handles missing locale", () => {
    expect(resolveFallbackChain("en", { defaultLocale: "en" })).toEqual(["en"]);
    expect(resolveFallbackChain(undefined, { defaultLocale: "en" })).toEqual(["en"]);
  });
});

describe("lookupLocale", () => {
  const dict = { en: { t: "Hi" }, tr: { t: "Selam" }, es: { t: "Hola" } };

  it("returns the first locale in the chain that exists", () => {
    expect(lookupLocale(dict, "tr-TR", { defaultLocale: "en" })).toEqual({
      content: dict.tr,
      locale: "tr",
    });
    expect(
      lookupLocale(dict, "pt", { fallbacks: { pt: ["es"] }, defaultLocale: "en" })?.locale,
    ).toBe("es");
  });

  it("falls back to the first available locale when nothing matches", () => {
    expect(lookupLocale({ de: { t: "Hallo" } }, "fr", { defaultLocale: "en" })?.locale).toBe("de");
    expect(lookupLocale({}, "fr", { defaultLocale: "en" })).toBeUndefined();
  });
});

describe("createGetDictionary with fallbacks", () => {
  const customDictMap = { home: { en: { t: "Hi" }, tr: { t: "Selam" }, es: { t: "Hola" } } };

  it("uses truncation and explicit chains, and warns when it had to fall back", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const tr = createGetDictionary({
      customDictMap,
      locale: "tr-TR",
      defaultLocale: "en",
      tag: "t",
    });
    expect(tr<{ t: string }>("home").t).toBe("Selam");
    expect(warn).toHaveBeenCalledOnce();

    const pt = createGetDictionary({
      customDictMap,
      locale: "pt",
      defaultLocale: "en",
      fallbacks: { pt: ["es"] },
      tag: "t",
    });
    expect(pt<{ t: string }>("home").t).toBe("Hola");

    warn.mockRestore();
  });

  it("does not warn when the requested locale exists", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const en = createGetDictionary({ customDictMap, locale: "en", defaultLocale: "en", tag: "t" });
    expect(en<{ t: string }>("home").t).toBe("Hi");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
