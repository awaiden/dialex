import type { DialexClientConfig, DialexSource } from "./index.js";
import { lookupLocale } from "./resolver.js";
import { normalizeDictionaries } from "./shared.js";

/**
 * Where a provider finds its dictionaries. Built from the generated `dialex` export, so nothing
 * is global: two copies of dialexjs in one bundle each work with what they were given.
 */
export interface DictionaryStore {
  config: DialexClientConfig;
  /** True when dictionaries are loaded on demand. */
  lazy: boolean;
  /** Loaded dictionaries by name. Filled in as lazy loads finish. */
  dictionaries: Record<string, Record<string, any>>;
  /** Loads `name` if needed. Resolves to `undefined` when there is no such dictionary. */
  load(name: string): Promise<Record<string, any> | undefined>;
}

export function createDictionaryStore(source: DialexSource = {}): DictionaryStore {
  const loaders = source.loaders;
  const dictionaries = { ...normalizeDictionaries(source.dictionaries) };
  const pending: Record<string, Promise<Record<string, any> | undefined>> = {};

  return {
    config: source.config ?? {},
    lazy: !!loaders && Object.keys(loaders).length > 0,
    dictionaries,
    load(name) {
      if (dictionaries[name]) return Promise.resolve(dictionaries[name]);
      const load = loaders?.[name];
      if (!load) return Promise.resolve(undefined);
      pending[name] ??= load().then((mod) => {
        const def = mod?.default ?? mod;
        dictionaries[name] = def.dictionary;
        return def.dictionary as Record<string, any>;
      });
      return pending[name];
    },
  };
}

const stores = new WeakMap<object, DictionaryStore>();

/**
 * The store for a `dialex` source, created once. Providers and `preloadDictionaries(dialex, ...)`
 * therefore share their loaded dictionaries.
 */
export function getDictionaryStore(source: DialexSource = {}): DictionaryStore {
  const key = source.loaders ?? source.dictionaries ?? source.config;
  if (!key || typeof key !== "object") return createDictionaryStore(source);
  let store = stores.get(key);
  if (!store) {
    store = createDictionaryStore(source);
    stores.set(key, store);
  }
  return store;
}

/** Starts loading dictionaries (a no-op unless they are lazy). */
export function preloadDictionaries(source: DialexSource, ...names: string[]): Promise<void> {
  const store = getDictionaryStore(source);
  return Promise.all(names.map((name) => store.load(name))).then(() => undefined);
}

/**
 * Reads an already-loaded dictionary for a locale, following fallbacks. `quiet` skips the
 * "not found" warning, for lazy dictionaries that simply have not arrived yet.
 */
export function readDictionary(
  store: DictionaryStore,
  name: string,
  locale: string,
  quiet = false,
): any {
  const dictionary = store.dictionaries[name];
  if (!dictionary) {
    if (!quiet) {
      console.warn(
        store.lazy
          ? `[dialex] Dictionary "${name}" is not loaded yet. Pass it to useT("${name}") or call useDictionary("${name}") first.`
          : `[dialex] Dictionary "${name}" not found.`,
      );
    }
    return {};
  }

  const defaultLocale = store.config.defaultLocale || Object.keys(dictionary)[0];
  const found = lookupLocale(dictionary, locale, {
    fallbacks: store.config.fallbacks,
    defaultLocale,
  });
  if (!found) return {};

  if (found.locale !== locale) {
    console.warn(
      `[dialex] Locale "${locale}" not found in dictionary "${name}", using "${found.locale}".`,
    );
  }
  return found.content;
}
