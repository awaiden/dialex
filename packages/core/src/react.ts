import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  use,
  useState,
  type ReactNode,
} from "react";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { createT, type Translate } from "./index.js";
import { lookupLocale } from "./resolver.js";

// @ts-ignore
import dictionaries, { lazy, loadDictionary } from "virtual:dialex-dictionaries";
// @ts-ignore
import config from "virtual:dialex-config";

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export interface I18nProviderProps {
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

export function I18nProvider({
  children,
  defaultLocale,
  initialLocale,
  persist = "cookie",
  storageKey = "locale",
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<string>(
    initialLocale || defaultLocale || config.defaultLocale || "en",
  );

  useEffect(() => {
    if (initialLocale) return;
    const stored = readPersistedLocale(persist, storageKey);
    const supported = !config.locales?.length || config.locales.includes(stored);
    if (stored && supported) setLocaleState(stored);
    // Only on mount: later changes go through setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: string) => {
      setLocaleState(next);
      writePersistedLocale(persist, storageKey, next);
    },
    [persist, storageKey],
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// This interface can be augmented by the generated .d.ts file
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

/**
 * Starts loading dictionaries (a no-op unless `lazy: true`). Call it from a route preloader or
 * an event handler to avoid showing a loading state later.
 */
export function preloadDictionaries(...names: string[]): Promise<void> {
  return Promise.all(names.map((name) => loadDictionary(name))).then(() => undefined);
}

/** Suspends until `name` is loaded when dictionaries are lazy. */
function ensureLoaded(name: string): void {
  if (lazy && !dictionaries[name]) use(loadDictionary(name));
}

/** Reads an already-loaded dictionary for a locale, following fallbacks. */
function readLoaded(name: string, locale: string): any {
  const dictionary = dictionaries[name];

  if (!dictionary) {
    console.warn(
      lazy
        ? `[dialex] Dictionary "${name}" is not loaded yet. Pass it to useT("${name}") or call useDictionary("${name}") first.`
        : `[dialex] Dictionary "${name}" not found.`,
    );
    return {};
  }

  const defaultLocale = config.defaultLocale || Object.keys(dictionary)[0];
  const found = lookupLocale(dictionary, locale, { fallbacks: config.fallbacks, defaultLocale });
  if (!found) return {};

  if (found.locale !== locale) {
    console.warn(
      `[dialex] Locale "${locale}" not found in dictionary "${name}", using "${found.locale}".`,
    );
  }
  return found.content;
}

/**
 * Returns the dictionary for the current locale. With `lazy: true` this suspends until the
 * dictionary has loaded, so render it under a `<Suspense>` boundary.
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T {
  const { locale } = useI18n();
  ensureLoaded(name as string);
  return readLoaded(name as string, locale) as T;
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function bound to the current locale.
 *
 * With `lazy: true`, name the dictionaries you will read so they are loaded first
 * (this suspends until they are): `const t = useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale } = useI18n();
  for (const name of dictionaryNames) ensureLoaded(name);
  return useMemo(() => createT((name) => readLoaded(name, locale), locale), [locale]);
}
