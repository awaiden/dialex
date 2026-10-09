import type { DialexClientConfig, DialexSource } from "./index.js";
import { lookupLocale, resolveFallbackChain } from "./resolver.js";
import { normalizeDictionaries } from "./shared.js";

/**
 * Where a provider finds its dictionaries. Built from the generated `dialex` export, so nothing
 * is global: two copies of dialexjs in one bundle each work with what they were given.
 */
export interface DictionaryStore {
  config: DialexClientConfig;
  /** True when dictionaries are loaded on demand. */
  lazy: boolean;
  /** Loaded dictionaries by name. Filled in as lazy loads finish (locale by locale in `"locale"` mode). */
  dictionaries: Record<string, Record<string, any>>;
  /**
   * Loads `name` if needed. In `"locale"` mode only the locale `locale` resolves to is loaded
   * (the requested locale, or the first of its fallbacks that has a loader). Resolves to
   * `undefined` when there is no such dictionary.
   */
  load(name: string, locale?: string): Promise<Record<string, any> | undefined>;
  /** Whether `name` can be read for `locale` without waiting. */
  isLoaded(name: string, locale?: string): boolean;
}

/** The locale a per-locale dictionary is loaded as: the first of the fallback chain that has a loader. */
function localeToLoad(
  locales: string[],
  locale: string | undefined,
  config: DialexClientConfig,
): string {
  const chain = resolveFallbackChain(locale ?? config.defaultLocale, {
    fallbacks: config.fallbacks,
    defaultLocale: config.defaultLocale,
  });
  return chain.find((candidate) => locales.includes(candidate)) ?? locales[0];
}

export function createDictionaryStore(source: DialexSource = {}): DictionaryStore {
  const loaders = source.loaders;
  const config = source.config ?? {};
  const dictionaries = { ...normalizeDictionaries(source.dictionaries) };
  const pending: Record<string, Promise<Record<string, any> | undefined>> = {};

  const loaderFor = (name: string, locale?: string) => {
    const loader = loaders?.[name];
    if (!loader) return undefined;
    if (typeof loader === "function") return { run: loader, locale: undefined };
    const target = localeToLoad(Object.keys(loader), locale, config);
    return target === undefined ? undefined : { run: loader[target], locale: target };
  };

  return {
    config,
    lazy: !!loaders && Object.keys(loaders).length > 0,
    dictionaries,
    isLoaded(name, locale) {
      const loader = loaders?.[name];
      if (!loader || typeof loader === "function") return dictionaries[name] !== undefined;
      const target = localeToLoad(Object.keys(loader), locale, config);
      return target !== undefined && dictionaries[name]?.[target] !== undefined;
    },
    load(name, locale) {
      const loader = loaderFor(name, locale);
      if (!loader) return Promise.resolve(dictionaries[name]);
      if (loader.locale === undefined ? dictionaries[name] : dictionaries[name]?.[loader.locale]) {
        return Promise.resolve(dictionaries[name]);
      }
      const key = `${name}\0${loader.locale ?? ""}`;
      pending[key] ??= loader.run().then((mod) => {
        const def = mod?.default ?? mod;
        if (loader.locale === undefined) {
          dictionaries[name] = def.dictionary;
        } else {
          // `def` is the locale's content itself
          dictionaries[name] = { ...dictionaries[name], [loader.locale]: def };
        }
        return dictionaries[name];
      });
      return pending[key];
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

/**
 * Starts loading dictionaries (a no-op unless they are lazy). In `lazy: "locale"` mode it loads the
 * default locale unless you pass `{ locale }` first: `preloadDictionaries(dialex, { locale: "tr" }, "home")`.
 */
export function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void> {
  const store = getDictionaryStore(source);
  const options = typeof rest[0] === "object" ? (rest.shift() as { locale?: string }) : {};
  const names = rest as string[];
  return Promise.all(names.map((name) => store.load(name, options.locale))).then(() => undefined);
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
  // In `lazy: "locale"` mode another locale may already be loaded; do not show it as a fallback.
  if (dictionary && store.lazy && !store.isLoaded(name, locale)) return {};
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
