import {
  computed,
  getCurrentInstance,
  inject,
  onServerPrefetch,
  ref,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import { createT, type Translate } from "./index.js";
import { lookupLocale } from "./resolver.js";

// @ts-ignore
import dictionaries, { lazy, loadDictionary } from "virtual:dialex-dictionaries";
// @ts-ignore
import config from "virtual:dialex-config";

export interface I18nContext {
  locale: Ref<string>;
  setLocale: (locale: string) => void;
}

export interface CreateI18nOptions {
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

export const I18N_KEY: InjectionKey<I18nContext> = Symbol("dialex-i18n");

/**
 * Vue plugin that provides the active locale to `useI18n()` and `useDictionary()`.
 *
 * ```ts
 * createApp(App).use(createI18n({ defaultLocale: "en" })).mount("#app");
 * ```
 */
export function createI18n(options: CreateI18nOptions = {}) {
  const locale = ref(options.defaultLocale || config?.defaultLocale || "en");
  const context: I18nContext = {
    locale,
    setLocale(next) {
      locale.value = next;
      options.onLocaleChange?.(next);
    },
  };

  return {
    ...context,
    install(app: App) {
      app.provide(I18N_KEY, context);
    },
  };
}

export function useI18n(): I18nContext {
  const context = inject(I18N_KEY, undefined);
  if (!context) {
    throw new Error("useI18n requires the plugin from createI18n() to be installed");
  }
  return context;
}

/** Bumped whenever a lazy dictionary finishes loading, so computed values re-read. */
const loadedVersion = ref(0);

/**
 * Starts loading dictionaries (a no-op unless `lazy: true`). Call it from a route guard or an
 * event handler to avoid showing empty content later.
 */
export function preloadDictionaries(...names: string[]): Promise<void> {
  return Promise.all(names.map((name) => loadDictionary(name))).then(() => undefined);
}

/** Starts loading `name` if needed, and makes SSR wait for it. */
function ensureLoaded(name: string): void {
  if (!lazy || dictionaries[name]) return;
  const pending = loadDictionary(name).then(() => {
    loadedVersion.value++;
  });
  if (getCurrentInstance()) onServerPrefetch(() => pending);
}

/** Reads an already-loaded dictionary for a locale, following fallbacks. */
function readLoaded(name: string, locale: string): any {
  void loadedVersion.value; // track lazy loads
  const dictionary = dictionaries[name];
  if (!dictionary) {
    // While a lazy dictionary is still loading there is nothing to warn about yet.
    if (!lazy) console.warn(`[dialex] Dictionary "${name}" not found.`);
    return {};
  }

  const defaultLocale = config?.defaultLocale || Object.keys(dictionary)[0];
  const found = lookupLocale(dictionary, locale, { fallbacks: config?.fallbacks, defaultLocale });
  if (!found) return {};

  if (found.locale !== locale) {
    console.warn(
      `[dialex] Locale "${locale}" not found in dictionary "${name}", using "${found.locale}".`,
    );
  }
  return found.content;
}

/**
 * Returns the dictionary for the current locale as a computed ref. With `lazy: true` it is empty
 * until the dictionary has loaded, then updates (and SSR waits for it).
 */
export function useDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
): ComputedRef<T> {
  const { locale } = useI18n();
  ensureLoaded(name as string);
  return computed(() => readLoaded(name as string, locale.value) as T);
}

/**
 * Returns a `t("dictionary.key.path", ...args)` function that follows the current locale.
 * Reading it inside a template or computed keeps the result reactive.
 *
 * With `lazy: true`, name the dictionaries you will read so they are loaded:
 * `const t = useT("home", "nav")`.
 */
export function useT(...dictionaryNames: string[]): Translate {
  const { locale } = useI18n();
  for (const name of dictionaryNames) ensureLoaded(name);
  return ((path: string, ...args: any[]) =>
    (createT((name) => readLoaded(name, locale.value), locale.value) as any)(
      path,
      ...args,
    )) as Translate;
}
