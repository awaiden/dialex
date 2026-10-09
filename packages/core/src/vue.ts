import {
  computed,
  getCurrentInstance,
  inject,
  onServerPrefetch,
  ref,
  watch,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";

import { createT, type Translate } from "./index.js";
import type { DialexSource } from "./index.js";
import { getDictionaryStore, readDictionary, type DictionaryStore } from "./store.js";

export { preloadDictionaries } from "./store.js";

export interface DialexContext {
  locale: Ref<string>;
  setLocale: (locale: string) => void;
  store: DictionaryStore;
}

export interface CreateDialexOptions extends DialexSource {
  /** Initial locale. Falls back to the project config, then `"en"`. */
  defaultLocale?: string;
  /** Called after the locale changes, e.g. to persist it in a cookie. */
  onLocaleChange?: (locale: string) => void;
}

// This interface can be augmented by the generated .d.ts file
export interface DictionaryRegistry {}

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

export const DIALEX_KEY: InjectionKey<DialexContext> = Symbol("dialex");

/**
 * Vue plugin that provides the active locale to `useDialex()` and `useDictionary()`.
 *
 * ```ts
 * createApp(App).use(createDialex({ defaultLocale: "en" })).mount("#app");
 * ```
 */
export function createDialex(options: CreateDialexOptions = {}) {
  const store = getDictionaryStore(options);
  const locale = ref(options.defaultLocale || store.config.defaultLocale || "en");
  const context: DialexContext = {
    store,
    locale,
    setLocale(next) {
      locale.value = next;
      options.onLocaleChange?.(next);
    },
  };

  return {
    ...context,
    install(app: App) {
      app.provide(DIALEX_KEY, context);
    },
  };
}

export function useDialex(): DialexContext {
  const context = inject(DIALEX_KEY, undefined);
  if (!context) {
    throw new Error("useDialex requires the plugin from createDialex() to be installed");
  }
  return context;
}

/** Bumped whenever a lazy dictionary finishes loading, so computed values re-read. */
const loadedVersion = ref(0);

/** Starts loading `name` if needed, and makes SSR wait for it. */
function ensureLoaded(store: DictionaryStore, name: string, locale: string): void {
  if (!store.lazy || store.isLoaded(name, locale)) return;
  const pending = store.load(name, locale).then(() => {
    loadedVersion.value++;
  });
  if (getCurrentInstance()) onServerPrefetch(() => pending);
}

/** Reads an already-loaded dictionary, tracking lazy loads so computed values re-read. */
function readLoaded(store: DictionaryStore, name: string, locale: string): any {
  void loadedVersion.value;
  // While a lazy dictionary is still loading there is nothing to warn about yet.
  return readDictionary(store, name, locale, store.lazy);
}

/**
 * Returns the dictionary for the current locale as a computed ref. With `lazy: true` it is empty
 * until the dictionary has loaded, then updates (and SSR waits for it).
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
): ComputedRef<T> {
  const { locale, store } = useDialex();
  ensureLoaded(store, name as string, locale.value);
  // A locale switch may need another download (`lazy: "locale"`)
  watch(locale, (next) => ensureLoaded(store, name as string, next));
  return computed(() => readLoaded(store, name as string, locale.value) as T);
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function that follows the current locale.
 * Reading it inside a template or computed keeps the result reactive.
 *
 * With `lazy: true`, name the dictionaries you will read so they are loaded:
 * `const t = useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale, store } = useDialex();
  for (const name of dictionaryNames) {
    ensureLoaded(store, name, locale.value);
    watch(locale, (next) => ensureLoaded(store, name, next));
  }
  return ((path: string, ...args: any[]) =>
    (createT((name) => readLoaded(store, name, locale.value), locale.value) as any)(
      path,
      ...args,
    )) as Translate;
}
