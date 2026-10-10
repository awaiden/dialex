import { getContext, onMount, setContext } from "svelte";
import { derived, writable, type Readable } from "svelte/store";

import { createT, type DialexSource, type Translate } from "./index.js";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { getDictionaryStore, readDictionary, type DictionaryStore } from "./store.js";

export { preloadDictionaries } from "./store.js";

// This interface can be augmented by the generated .d.ts file
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

export interface DialexOptions {
  /** Locale used when nothing else decides. Falls back to the config, then `"en"`. */
  defaultLocale?: string;
  /**
   * The locale to render first, for example the one the server resolved from the request. When
   * set, the remembered locale is not applied on mount.
   */
  initialLocale?: string;
  /**
   * Where to remember the user's choice. The remembered locale is applied after mount, so
   * server-rendered markup and the first client render agree.
   * @default "cookie"
   */
  persist?: PersistMode;
  /**
   * Cookie or localStorage key.
   * @default "locale"
   */
  storageKey?: string;
  /** Called after the locale changes. */
  onLocaleChange?: (locale: string) => void;
}

export interface DialexSvelte {
  /** The active locale. Use it as `$locale` in components. */
  locale: Readable<string>;
  setLocale: (locale: string) => void;
  store: DictionaryStore;
  /** A store with the dictionary for the current locale (`$home.title`). */
  dictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): Readable<T>;
  /**
   * A store with a `t("dictionary.key.path", ...args)` function bound to the current locale
   * (`$t("home.title")`). With lazy dictionaries, name the ones you will read so they load.
   */
  translator(...dictionaryNames: string[]): Readable<Translate>;
}

/**
 * The reactive core of the Svelte adapter, without Svelte's component context, so it works in
 * plain modules and in tests. Components use {@link provideDialex} and {@link useDialex}.
 */
export function createSvelteDialex(
  source: DialexSource = {},
  options: DialexOptions = {},
): DialexSvelte {
  const { dictionaries, config, loaders } = source;
  const store = getDictionaryStore({ dictionaries, config, loaders });
  const persist = options.persist ?? "cookie";
  const storageKey = options.storageKey ?? "locale";

  const locale = writable<string>(
    options.initialLocale || options.defaultLocale || store.config.defaultLocale || "en",
  );
  /** Bumped when a lazy dictionary finishes loading, so derived stores read again. */
  const loadedVersion = writable(0);

  function ensureLoaded(name: string, forLocale: string): void {
    if (!store.lazy || store.isLoaded(name, forLocale)) return;
    void store.load(name, forLocale).then(() => loadedVersion.update((n) => n + 1));
  }

  return {
    locale: { subscribe: locale.subscribe },
    store,
    setLocale(next) {
      locale.set(next);
      writePersistedLocale(persist, storageKey, next);
      syncDocumentLang(next);
      options.onLocaleChange?.(next);
    },
    dictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K) {
      return derived([locale, loadedVersion], ([$locale]) => {
        ensureLoaded(name as string, $locale);
        // While a lazy dictionary is still loading there is nothing to warn about yet.
        return readDictionary(store, name as string, $locale, store.lazy) as T;
      });
    },
    translator(...dictionaryNames) {
      return derived([locale, loadedVersion], ([$locale]): Translate => {
        for (const name of dictionaryNames) ensureLoaded(name, $locale);
        return createT(
          (name) => readDictionary(store, name, $locale, store.lazy),
          $locale,
        ) as unknown as Translate;
      }) as unknown as Readable<Translate>;
    },
  };
}

const DIALEX_KEY = Symbol("dialex");

/**
 * Makes Dialex available to the component and everything below it. Call it once, in the script of
 * your root component, with the generated `dialex` export:
 *
 * ```svelte
 * <script lang="ts">
 *   import { provideDialex } from "dialexjs/svelte";
 *   import { dialex } from "./dialex.generated";
 *   provideDialex({ ...dialex });
 * </script>
 * ```
 */
export function provideDialex(
  source: DialexSource = {},
  options: DialexOptions = {},
): DialexSvelte {
  const instance = createSvelteDialex(source, options);
  setContext(DIALEX_KEY, instance);

  // Apply the remembered locale after mount, so hydration always matches the server's markup.
  onMount(() => {
    const persist = options.persist ?? "cookie";
    if (!options.initialLocale) {
      const stored = readPersistedLocale(persist, options.storageKey ?? "locale");
      const locales = instance.store.config.locales;
      if (stored && (!locales?.length || locales.includes(stored))) instance.setLocale(stored);
    }
  });

  return instance;
}

/** The nearest {@link provideDialex}: the locale store, `setLocale`, and the dictionary store. */
export function useDialex(): DialexSvelte {
  const instance = getContext<DialexSvelte | undefined>(DIALEX_KEY);
  if (!instance) {
    throw new Error("useDialex requires provideDialex() in a parent component");
  }
  return instance;
}

/** A store with the dictionary for the current locale: `const home = useDictionary("home")`. */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
): Readable<T> {
  return useDialex().dictionary<K, T>(name);
}

/** A store with a translate function: `const t = useT("home")`, then `$t("home.title")`. */
export function useT(...dictionaryNames: string[]): Readable<Translate> {
  return useDialex().translator(...dictionaryNames);
}
