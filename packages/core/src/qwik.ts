import {
  createContextId,
  useContext,
  useContextProvider,
  useStore,
  type ContextId,
} from "@builder.io/qwik";

import { createT, type DialexSource, type Translate } from "./index.js";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { getDictionaryStore, readDictionary } from "./store.js";

export { preloadDictionaries } from "./store.js";

// This interface can be augmented by the generated .d.ts file
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

/** What the context holds. It is plain data, so Qwik can serialize it and resume on the client. */
export interface DialexState {
  locale: string;
  /** Counts finished lazy loads, so components that read a dictionary render again. */
  loaded: number;
}

export interface CreateDialexQwikOptions extends DialexSource {
  /**
   * Where `setLocale` remembers the choice. Reading it back is up to the server, which passes the
   * result to `useDialexProvider({ initialLocale })`.
   * @default "cookie"
   */
  persist?: PersistMode;
  /**
   * Cookie or localStorage key.
   * @default "locale"
   */
  storageKey?: string;
}

export interface UseDialexProviderOptions {
  /** The locale to start with, for example the one the server resolved from the request. */
  initialLocale?: string;
}

/**
 * Binds the Qwik hooks to your dictionaries. Call it once, in a module of its own, and import the
 * hooks from there. The dictionaries stay in that module and are never serialized into the page:
 *
 * ```ts
 * // src/i18n.ts
 * import { createDialexQwik } from "dialexjs/qwik";
 * import { dialex } from "./dialex.generated";
 *
 * export const { useDialexProvider, useDialex, useDictionary, useT, setLocale } =
 *   createDialexQwik({ ...dialex });
 * ```
 *
 * ```tsx
 * // src/routes/layout.tsx
 * export default component$(() => {
 *   useDialexProvider();
 *   return <Slot />;
 * });
 * ```
 */
export function createDialexQwik(options: CreateDialexQwikOptions = {}) {
  const { dictionaries, config, loaders, persist = "cookie", storageKey = "locale" } = options;
  const store = getDictionaryStore({ dictionaries, config, loaders });
  const defaultLocale = store.config.defaultLocale || "en";

  // The id is the same for every instance, so use one `createDialexQwik` per app.
  const context: ContextId<DialexState> = createContextId<DialexState>("dialex");

  /** Provides the locale to the components below. Call it in the root layout. */
  function useDialexProvider(providerOptions: UseDialexProviderOptions = {}): DialexState {
    const state = useStore<DialexState>({
      locale: providerOptions.initialLocale || defaultLocale,
      loaded: 0,
    });
    useContextProvider(context, state);
    return state;
  }

  /**
   * The locale state of the nearest provider. Read `state.locale`, and change it with
   * `setLocale(state, "tr")`.
   */
  function useDialex(): DialexState {
    return useContext(context);
  }

  /**
   * Changes the locale and remembers it. It is a plain function so a `onClick$` can call it
   * without capturing anything that cannot be serialized.
   */
  function setLocale(state: DialexState, locale: string): void {
    state.locale = locale;
    writePersistedLocale(persist, storageKey, locale);
    syncDocumentLang(locale);
  }

  /**
   * With lazy dictionaries, starts loading `name` for `locale` and renders the readers again when
   * it arrives. On the server nothing waits for it: `await preloadDictionaries(dialex, ...)` in a
   * `routeLoader$` so the first render has the text.
   */
  function ensureLoaded(state: DialexState, name: string, locale: string): void {
    if (!store.lazy || store.isLoaded(name, locale)) return;
    store
      .load(name, locale)
      .then(() => {
        state.loaded++;
      })
      .catch((error) => console.error(`[dialex] Could not load dictionary "${name}".`, error));
  }

  /**
   * An accessor for the dictionary of the current locale: `const home = useDictionary("home")`,
   * then `home().title` in JSX. The component renders again when the locale changes.
   *
   * It is a function on purpose. Qwik turns a plain property read such as `home.title` in JSX into
   * a derived signal over the object it saw first, and does not refresh it when the object is
   * replaced. A call is evaluated again on every render.
   */
  function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): () => T {
    const state = useContext(context);
    const locale = state.locale;
    void state.loaded; // tracked, so the component renders again when a lazy load finishes
    ensureLoaded(state, name as string, locale);
    return () => readDictionary(store, name as string, locale, store.lazy) as T;
  }

  /** A `t("dictionary.key.path", ...args)` bound to the current locale. */
  function useT(): Translate {
    const state = useContext(context);
    const locale = state.locale;
    void state.loaded;
    return createT((name) => {
      ensureLoaded(state, name, locale);
      return readDictionary(store, name, locale, store.lazy);
    }, locale) as Translate;
  }

  /**
   * The locale remembered by `setLocale` in this browser, when the app supports it. It is
   * `undefined` on the server, where the request decides: pass its result (or the request's) to
   * `useDialexProvider({ initialLocale })`.
   */
  function getPersistedLocale(): string | undefined {
    const stored = readPersistedLocale(persist, storageKey);
    const supported = !store.config.locales?.length || store.config.locales.includes(stored ?? "");
    return stored && supported ? stored : undefined;
  }

  return { useDialexProvider, useDialex, setLocale, useDictionary, useT, getPersistedLocale };
}
