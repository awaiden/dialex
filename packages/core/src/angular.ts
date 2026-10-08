import {
  InjectionToken,
  afterNextRender,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
  type Signal,
} from "@angular/core";
import { createT, type Translate } from "./index.js";
import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "./persist.js";
import { createGetDictionary, normalizeDictionaries, type DictionaryInput } from "./shared.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export interface AngularI18nOptions {
  /**
   * The dictionaries, usually the output of `dialex generate`:
   * `import dictionaries from "./i18n.generated"`.
   */
  dictionaries: DictionaryInput;
  /** Locale used when nothing else decides. @default "en" */
  defaultLocale?: string;
  /** Supported locales. A remembered locale outside this list is ignored. */
  locales?: string[];
  /** Explicit [fallback chains](https://dialex.dev/guide/fallbacks). */
  fallbacks?: Record<string, string[]>;
  /**
   * The locale to render first. May be a function, which runs in the injection context so it can
   * call `inject()` (for example to read the request during server-side rendering).
   * When set, the remembered locale is not applied after hydration.
   */
  initialLocale?: string | (() => string);
  /** Where to remember the user's choice. @default "cookie" */
  persist?: PersistMode;
  /** Cookie or localStorage key. @default "locale" */
  storageKey?: string;
}

export interface DialexStore {
  /** The active locale. Read it in a template or `computed` to react to changes. */
  readonly locale: Signal<string>;
  setLocale(locale: string): void;
  /** The dictionary for the active locale, as a signal. */
  dictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): Signal<T>;
  /**
   * `t("dictionary.key.path", ...args)` for the active locale. It reads the locale signal on each
   * call, so using it in a template keeps the template up to date when the locale changes.
   */
  readonly t: Translate;
}

export const DIALEX_OPTIONS = new InjectionToken<AngularI18nOptions>("DIALEX_OPTIONS");

function createStore(options: AngularI18nOptions): DialexStore {
  const {
    defaultLocale = "en",
    locales,
    fallbacks,
    initialLocale,
    persist = "cookie",
    storageKey = "locale",
  } = options;
  const customDictMap = normalizeDictionaries(options.dictionaries) ?? {};

  const initial =
    (typeof initialLocale === "function" ? initialLocale() : initialLocale) || defaultLocale;
  const locale = signal(initial);
  syncDocumentLang(initial);

  // Apply a remembered locale only after the first render, so server-rendered markup and the
  // first client render agree.
  if (!initialLocale) {
    afterNextRender(() => {
      const stored = readPersistedLocale(persist, storageKey);
      if (stored && stored !== locale() && (!locales?.length || locales.includes(stored))) {
        locale.set(stored);
        syncDocumentLang(stored);
      }
    });
  }

  const read = (name: string, forLocale: string) =>
    createGetDictionary({
      customDictMap,
      locale: forLocale,
      defaultLocale,
      fallbacks,
      tag: "angular",
    })(name);

  const translate = computed(() => {
    const current = locale();
    return createT((name) => read(name, current), current);
  });

  return {
    locale,
    setLocale(next) {
      locale.set(next);
      writePersistedLocale(persist, storageKey, next);
      syncDocumentLang(next);
    },
    dictionary: (name) => computed(() => read(name as string, locale())) as Signal<any>,
    t: ((path: string, ...args: any[]) => (translate() as any)(path, ...args)) as Translate,
  };
}

/** The Dialex store. Provided in root once `provideDialex()` has configured it. */
export const DIALEX = new InjectionToken<DialexStore>("DIALEX", {
  providedIn: "root",
  factory: () => {
    const options = inject(DIALEX_OPTIONS, { optional: true });
    if (!options) {
      throw new Error(
        "Dialex is not configured. Add provideDialex({ dictionaries }) to your providers.",
      );
    }
    return createStore(options);
  },
});

/**
 * Configures Dialex for an Angular application.
 *
 * ```ts
 * // app.config.ts
 * import dictionaries from "./i18n.generated";
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideDialex({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
 * };
 * ```
 */
export function provideDialex(options: AngularI18nOptions): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DIALEX_OPTIONS, useValue: options }]);
}

/** The whole store: `locale`, `setLocale`, `dictionary`, `t`. Call in an injection context. */
export function injectI18n(): DialexStore {
  return inject(DIALEX);
}

/** The dictionary for the active locale as a signal. Call in an injection context. */
export function injectDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
): Signal<T> {
  return inject(DIALEX).dictionary<K, T>(name);
}

/** The `t` function for the active locale. Call in an injection context. */
export function injectT(): Translate {
  return inject(DIALEX).t;
}
