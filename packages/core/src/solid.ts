import {
  createComponent,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";

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

export interface DialexProviderProps extends DialexSource {
  children?: JSX.Element;
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

export interface DialexContext {
  /** The active locale. Read it as `locale()` inside JSX or an effect. */
  locale: Accessor<string>;
  setLocale: (locale: string) => void;
  store: DictionaryStore;
  /** Changes whenever a lazy dictionary finishes loading, so readers update. */
  loaded: Accessor<number>;
  /** Starts loading `name` for `locale` if the dictionaries are lazy. */
  ensureLoaded: (name: string, locale: string) => void;
}

const DialexSolidContext = createContext<DialexContext>();

/**
 * Provides the active locale to `useDialex()`, `useDictionary()` and `useT()`:
 *
 * ```tsx
 * import { dialex } from "./dialex.generated";
 *
 * render(
 *   () => (
 *     <DialexProvider {...dialex}>
 *       <App />
 *     </DialexProvider>
 *   ),
 *   root,
 * );
 * ```
 */
export function DialexProvider(props: DialexProviderProps): JSX.Element {
  // One store per generated `dialex` object, so `preloadDictionaries(dialex, ...)` shares it.
  const store = getDictionaryStore({
    dictionaries: props.dictionaries,
    config: props.config,
    loaders: props.loaders,
  });
  const persist = () => props.persist ?? "cookie";
  const storageKey = () => props.storageKey ?? "locale";

  const [locale, setLocaleSignal] = createSignal<string>(
    props.initialLocale || props.defaultLocale || store.config.defaultLocale || "en",
  );
  const [loaded, setLoaded] = createSignal(0);

  onMount(() => {
    if (props.initialLocale) return;
    const stored = readPersistedLocale(persist(), storageKey());
    const locales = store.config.locales;
    if (stored && (!locales?.length || locales.includes(stored))) setLocaleSignal(stored);
  });
  createEffect(() => syncDocumentLang(locale()));

  const context: DialexContext = {
    locale,
    store,
    loaded,
    setLocale(next) {
      setLocaleSignal(next);
      writePersistedLocale(persist(), storageKey(), next);
      props.onLocaleChange?.(next);
    },
    ensureLoaded(name, forLocale) {
      if (!store.lazy || store.isLoaded(name, forLocale)) return;
      void store.load(name, forLocale).then(() => setLoaded((n) => n + 1));
    },
  };

  return createComponent(DialexSolidContext.Provider, {
    value: context,
    get children() {
      return props.children;
    },
  });
}

export function useDialex(): DialexContext {
  const context = useContext(DialexSolidContext);
  if (!context) {
    throw new Error("useDialex must be used within a DialexProvider");
  }
  return context;
}

/**
 * Returns an accessor for the dictionary of the current locale: `const home = useDictionary("home")`,
 * then `home().title` in JSX. It updates when the locale changes and, with lazy dictionaries, when
 * the dictionary has loaded.
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
): Accessor<T> {
  const { locale, store, loaded, ensureLoaded } = useDialex();
  return createMemo(() => {
    const current = locale();
    loaded();
    ensureLoaded(name as string, current);
    // While a lazy dictionary is still loading there is nothing to warn about yet.
    return readDictionary(store, name as string, current, store.lazy) as T;
  });
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function that follows the current locale. Call it
 * in JSX or in an effect so the result stays reactive.
 *
 * With lazy dictionaries, name the ones you will read so they are loaded: `useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale, store, loaded, ensureLoaded } = useDialex();
  return ((path: string, ...args: any[]) => {
    const current = locale();
    loaded();
    for (const name of dictionaryNames) ensureLoaded(name, current);
    return (createT((name) => readDictionary(store, name, current, store.lazy), current) as any)(
      path,
      ...args,
    );
  }) as Translate;
}
