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

  // The id is created per instance, so two apps on one page do not share a context.
  const context: ContextId<DialexState> = createContextId<DialexState>("dialex");

  /** Provides the locale to the components below. Call it in the root layout. */
  function useDialexProvider(providerOptions: UseDialexProviderOptions = {}): DialexState {
    const state = useStore<DialexState>({
      locale: providerOptions.initialLocale || defaultLocale,
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
    return () => readDictionary(store, name as string, locale) as T;
  }

  /** A `t("dictionary.key.path", ...args)` bound to the current locale. */
  function useT(): Translate {
    const state = useContext(context);
    const locale = state.locale;
    return createT((name) => readDictionary(store, name, locale), locale) as Translate;
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
