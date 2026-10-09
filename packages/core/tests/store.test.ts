import { describe, expect, it } from "vite-plus/test";

import {
  createDictionaryStore,
  getDictionaryStore,
  preloadDictionaries,
  readDictionary,
} from "../src/store.js";

const home = { en: { title: "Welcome" }, tr: { title: "Selam" } };

describe("createDictionaryStore", () => {
  it("is eager when it only has dictionaries", async () => {
    const store = createDictionaryStore({ dictionaries: [{ name: "home", dictionary: home }] });
    expect(store.lazy).toBe(false);
    expect(store.dictionaries.home).toBe(home);
    expect(await store.load("home")).toBe(home);
    expect(await store.load("missing")).toBeUndefined();
  });

  it("loads lazily, once per dictionary", async () => {
    let calls = 0;
    const store = createDictionaryStore({
      loaders: {
        home: async () => {
          calls++;
          return { default: { name: "home", dictionary: home } };
        },
      },
    });
    expect(store.lazy).toBe(true);
    expect(store.dictionaries.home).toBeUndefined();
    await Promise.all([store.load("home"), store.load("home")]);
    expect(calls).toBe(1);
    expect(store.dictionaries.home).toBe(home);
  });

  it("does not modify the object it was given", async () => {
    const given: Record<string, any> = {};
    const store = createDictionaryStore({
      dictionaries: given,
      loaders: { home: async () => ({ default: { name: "home", dictionary: home } }) },
    });
    await store.load("home");
    expect(given).toEqual({});
  });
});

describe("getDictionaryStore and preloadDictionaries", () => {
  it("returns one store per generated source, so preloading is shared with providers", async () => {
    const loaders = { home: async () => ({ default: { name: "home", dictionary: home } }) };
    const store = getDictionaryStore({ loaders, config: { lazy: true } });
    expect(getDictionaryStore({ loaders, config: { lazy: true } })).toBe(store);

    await preloadDictionaries({ loaders }, "home");
    expect(store.dictionaries.home).toBe(home);
  });
});

describe("readDictionary", () => {
  const store = createDictionaryStore({
    dictionaries: { home },
    config: { defaultLocale: "en", fallbacks: { "pt-BR": ["tr"] } },
  });

  it("reads a locale, follows fallbacks, and returns {} when nothing matches", () => {
    expect(readDictionary(store, "home", "tr")).toEqual({ title: "Selam" });
    expect(readDictionary(store, "home", "pt-BR")).toEqual({ title: "Selam" });
    expect(readDictionary(store, "nope", "en", true)).toEqual({});
  });
});

describe('per-locale loaders (lazy: "locale")', () => {
  /** Loaders that record which locales were downloaded. */
  function perLocale() {
    const loads: string[] = [];
    const loader = (locale: string, content: Record<string, string>) => async () => {
      loads.push(locale);
      return { default: content };
    };
    return {
      loads,
      source: {
        config: { defaultLocale: "en", fallbacks: { "pt-BR": ["tr"] } },
        loaders: {
          home: {
            en: loader("en", { title: "Welcome" }),
            tr: loader("tr", { title: "Selam" }),
          },
          legacy: async () => ({
            default: { name: "legacy", dictionary: { en: { a: "x" }, tr: { a: "y" } } },
          }),
        },
      },
    };
  }

  it("downloads only the locale in use", async () => {
    const { source, loads } = perLocale();
    const store = createDictionaryStore(source);
    expect(store.lazy).toBe(true);
    expect(store.isLoaded("home", "tr")).toBe(false);

    await store.load("home", "tr");
    expect(loads).toEqual(["tr"]);
    expect(store.dictionaries.home).toEqual({ tr: { title: "Selam" } });
    expect(store.isLoaded("home", "tr")).toBe(true);
    expect(store.isLoaded("home", "en")).toBe(false);
  });

  it("loads each locale once and keeps the ones already loaded", async () => {
    const { source, loads } = perLocale();
    const store = createDictionaryStore(source);
    await Promise.all([store.load("home", "tr"), store.load("home", "tr")]);
    await store.load("home", "en");
    await store.load("home", "tr");
    expect(loads).toEqual(["tr", "en"]);
    expect(Object.keys(store.dictionaries.home).sort()).toEqual(["en", "tr"]);
  });

  it("follows the fallback chain to a locale that has a loader", async () => {
    const { source, loads } = perLocale();
    const store = createDictionaryStore(source);
    await store.load("home", "pt-BR"); // falls back to tr by config
    expect(loads).toEqual(["tr"]);
    await store.load("home", "fr"); // unknown: the default locale
    expect(loads).toEqual(["tr", "en"]);
    expect(store.isLoaded("home", "pt-BR")).toBe(true);
  });

  it("mixes per-locale dictionaries with whole-file ones", async () => {
    const { source } = perLocale();
    const store = createDictionaryStore(source);
    await store.load("legacy", "tr");
    expect(store.dictionaries.legacy).toEqual({ en: { a: "x" }, tr: { a: "y" } });
    expect(store.isLoaded("legacy", "en")).toBe(true);
  });

  it("reads nothing for a locale that has not arrived, instead of showing another one", async () => {
    const { source } = perLocale();
    const store = createDictionaryStore(source);
    await store.load("home", "en");
    expect(readDictionary(store, "home", "en")).toEqual({ title: "Welcome" });
    expect(readDictionary(store, "home", "tr", true)).toEqual({});
    await store.load("home", "tr");
    expect(readDictionary(store, "home", "tr")).toEqual({ title: "Selam" });
  });

  it("preloadDictionaries takes a locale", async () => {
    const { source, loads } = perLocale();
    await preloadDictionaries(source, { locale: "tr" }, "home");
    await preloadDictionaries(source, "home");
    expect(loads).toEqual(["tr", "en"]); // the second call loads the default locale
  });
});
