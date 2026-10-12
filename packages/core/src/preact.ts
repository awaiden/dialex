import { createContext, createElement, type ComponentChildren, type VNode } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";

import { createT, type DialexClientConfig, type DialexSource, type Translate } from "./index.js";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { getDictionaryStore, readDictionary, type DictionaryStore } from "./store.js";

export { preloadDictionaries } from "./store.js";

// This interface can be augmented by the generated .d.ts file
/**
 * Maps dictionary names to their content types. `dialex generate` augments it in
 * `dialex-env.d.ts`, which is what types `getDictionary("home")` and autocompletes the names.
 * Leave it empty in your own code.
 */
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

/**
 * Props of the Preact `DialexProvider`: spread the generated `dialex` object into it, then optionally set the starting locale and persistence.
 */
export interface DialexProviderProps extends DialexSource {
  children?: ComponentChildren;
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

/**
 * What `useDialex()` returns: the active locale, `setLocale` and the dictionary store.
 */
export interface DialexContext {
  locale: string;
  setLocale: (locale: string) => void;
  store: DictionaryStore;
}

const DialexPreactContext = createContext<DialexContext | undefined>(undefined);

/**
 * Re-renders the calling component when the lazy dictionaries it asked for finish loading.
 * A no-op for eager dictionaries.
 */
function useLazyDictionaries(store: DictionaryStore, names: string[], locale: string): void {
  const [, setLoaded] = useState(0);
  const key = names.join("\0");
  useEffect(() => {
    if (!store.lazy) return;
    let active = true;
    for (const name of key ? key.split("\0") : []) {
      if (store.isLoaded(name, locale)) continue;
      store
        .load(name, locale)
        .then(() => active && setLoaded((n) => n + 1))
        .catch((error) => console.error(`[dialex] Could not load dictionary "${name}".`, error));
    }
    return () => {
      active = false;
    };
  }, [store, key, locale]);
}

/**
 * Provides the active locale to `useDialex()`, `useDictionary()` and `useT()`:
 *
 * ```tsx
 * import { render } from "preact";
 * import { DialexProvider } from "dialexjs/preact";
 * import { dialex } from "./dialex.generated";
 *
 * render(
 *   <DialexProvider {...dialex}>
 *     <App />
 *   </DialexProvider>,
 *   document.getElementById("app")!,
 * );
 * ```
 */
export function DialexProvider({
  children,
  dictionaries,
  config,
  loaders,
  defaultLocale,
  initialLocale,
  persist = "cookie",
  storageKey = "locale",
  onLocaleChange,
}: DialexProviderProps): VNode<any> {
  // One store per generated `dialex` object, so `preloadDictionaries(dialex, ...)` shares it.
  const store = getDictionaryStore({ dictionaries, config, loaders });
  const [locale, setLocaleState] = useState<string>(
    initialLocale || defaultLocale || store.config.defaultLocale || "en",
  );

  useEffect(() => {
    if (initialLocale) return;
    const stored = readPersistedLocale(persist, storageKey);
    const supported = !store.config.locales?.length || store.config.locales.includes(stored ?? "");
    if (stored && supported) setLocaleState(stored);
    // Only on mount: later changes go through setLocale.
  }, []);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  // Kept in a ref, so an inline `onLocaleChange` does not rebuild `setLocale` on each render.
  const onLocaleChangeRef = useRef(onLocaleChange);
  onLocaleChangeRef.current = onLocaleChange;

  const setLocale = useCallback(
    (next: string) => {
      setLocaleState(next);
      writePersistedLocale(persist, storageKey, next);
      onLocaleChangeRef.current?.(next);
    },
    [persist, storageKey],
  );

  const value = useMemo(() => ({ locale, setLocale, store }), [locale, setLocale, store]);
  return createElement(DialexPreactContext.Provider, { value }, children);
}

/**
 * The active locale, `setLocale` and the dictionary store of the nearest `DialexProvider`. Throws outside a provider.
 */
export function useDialex(): DialexContext {
  const context = useContext(DialexPreactContext);
  if (!context) {
    throw new Error("useDialex must be used within a DialexProvider");
  }
  return context;
}

/**
 * The generated config of the nearest `DialexProvider`, for components that need `locales` or
 * `prefixDefault`.
 */
export function useDialexConfig(): DialexClientConfig {
  return useDialex().store.config;
}

/**
 * Returns the dictionary for the current locale. With `lazy: true` it is an empty object until the
 * dictionary has loaded, and the component re-renders when it arrives.
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T {
  const { locale, store } = useDialex();
  useLazyDictionaries(store, [name as string], locale);
  return readDictionary(store, name as string, locale, store.lazy) as T;
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function bound to the current locale.
 *
 * With `lazy: true`, name the dictionaries you will read so they are loaded:
 * `const t = useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale, store } = useDialex();
  useLazyDictionaries(store, dictionaryNames, locale);
  return createT(
    (name) => readDictionary(store, name, locale, store.lazy),
    locale,
  ) as unknown as Translate;
}
