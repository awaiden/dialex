import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  startTransition,
  use,
  useState,
  type ReactNode,
} from "react";

import { createT, type DialexClientConfig, type DialexSource, type Translate } from "./index.js";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { getDictionaryStore, readDictionary, type DictionaryStore } from "./store.js";

export { preloadDictionaries } from "./store.js";

interface DialexContextType {
  locale: string;
  setLocale: (locale: string) => void;
  store: DictionaryStore;
}

const DialexContext = createContext<DialexContextType | undefined>(undefined);

export interface DialexProviderProps extends DialexSource {
  children: ReactNode;
  /** Locale used when nothing else decides. Falls back to the config, then `"en"`. */
  defaultLocale?: string;
  /**
   * The locale to render first. Pass the locale the server rendered with (for example read from
   * the request) so hydration matches. When set, the remembered locale is not applied on mount.
   */
  initialLocale?: string;
  /**
   * Where to remember the user's choice. The remembered locale is applied after mount, so
   * server-rendered markup and the first client render always agree.
   * @default "cookie"
   */
  persist?: PersistMode;
  /**
   * Cookie or localStorage key.
   * @default "locale"
   */
  storageKey?: string;
}

export function DialexProvider({
  children,
  dictionaries,
  config,
  loaders,
  defaultLocale,
  initialLocale,
  persist = "cookie",
  storageKey = "locale",
}: DialexProviderProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: string) => {
      // With lazy dictionaries the new locale may still be downloading. A transition keeps the
      // current language on screen until it is ready, instead of showing a loading state.
      if (store.lazy) startTransition(() => setLocaleState(next));
      else setLocaleState(next);
      writePersistedLocale(persist, storageKey, next);
    },
    [persist, storageKey, store],
  );

  const value = useMemo(() => ({ locale, setLocale, store }), [locale, setLocale, store]);
  return React.createElement(DialexContext.Provider, { value }, children);
}

export function useDialex() {
  const context = useContext(DialexContext);
  if (!context) {
    throw new Error("useDialex must be used within a DialexProvider");
  }
  return context;
}

// This interface can be augmented by the generated .d.ts file
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

/** Suspends until `name` is loaded when dictionaries are lazy. */
function ensureLoaded(store: DictionaryStore, name: string, locale: string): void {
  if (store.lazy && !store.isLoaded(name, locale)) use(store.load(name, locale));
}

/**
 * The generated config of the nearest `DialexProvider`, for components that need `locales` or
 * `prefixDefault` (such as `DialexLink`).
 */
export function useDialexConfig(): DialexClientConfig {
  return useDialex().store.config;
}

/**
 * Returns the dictionary for the current locale. With `lazy: true` this suspends until the
 * dictionary has loaded, so render it under a `<Suspense>` boundary.
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T {
  const { locale, store } = useDialex();
  ensureLoaded(store, name as string, locale);
  return readDictionary(store, name as string, locale) as T;
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function bound to the current locale.
 *
 * With `lazy: true`, name the dictionaries you will read so they are loaded first
 * (this suspends until they are): `const t = useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale, store } = useDialex();
  for (const name of dictionaryNames) ensureLoaded(store, name, locale);
  return useMemo(
    () => createT((name) => readDictionary(store, name, locale), locale),
    [locale, store],
  );
}
