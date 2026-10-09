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
