import type { ReactiveController, ReactiveControllerHost } from "lit";

import {
  readPersistedLocale,
  syncDocumentLang,
  writePersistedLocale,
  type PersistMode,
} from "../core/persist.js";
import { getDictionaryStore, readDictionary, type DictionaryStore } from "../core/store.js";
import { createT, type DialexClientConfig, type DialexSource, type Translate } from "../index.js";

export { preloadDictionaries } from "../core/store.js";

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
 * Options of `createDialex`: the generated dictionaries and config, the locale to start with and where the choice is remembered.
 */
export interface CreateDialexOptions extends DialexSource {
  /** Locale used when nothing else decides. Falls back to the config, then `"en"`. */
  defaultLocale?: string;
  /** The locale to start with. When set, the remembered locale is not applied. */
  initialLocale?: string;
  /**
   * Where to remember the user's choice. It is read when the instance is created.
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

/** The locale state of an app, shared by every component that uses it. */
export interface Dialex {
  /** The active locale. */
  readonly locale: string;
  readonly config: DialexClientConfig;
  readonly store: DictionaryStore;
  setLocale(locale: string): void;
  /** Calls `listener` after the locale changes or a lazy dictionary finishes loading. */
  subscribe(listener: () => void): () => void;
  /**
   * The dictionary for the active locale. With lazy dictionaries it is an empty object until the
   * dictionary has loaded; the listeners are called when it arrives.
   */
  getDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T;
  /** A `t("dictionary.key.path", ...args)` bound to the active locale. */
  t(...dictionaryNames: string[]): Translate;
}

/**
 * Creates the locale state for a set of dictionaries. Create it once, in a module of its own,
 * and import it wherever a component needs translations:
 *
 * ```ts
 * // src/i18n.ts
 * import { createDialex } from "dialexjs/lit";
 * import { dialex } from "./dialex.generated";
 *
 * export const i18n = createDialex({ ...dialex });
 * ```
 */
export function createDialex(options: CreateDialexOptions = {}): Dialex {
  const {
    dictionaries,
    config,
    loaders,
    defaultLocale,
    initialLocale,
    persist = "cookie",
    storageKey = "locale",
    onLocaleChange,
  } = options;
  const store = getDictionaryStore({ dictionaries, config, loaders });
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  let locale = initialLocale || defaultLocale || store.config.defaultLocale || "en";
  if (!initialLocale) {
    const stored = readPersistedLocale(persist, storageKey);
    const supported = !store.config.locales?.length || store.config.locales.includes(stored ?? "");
    if (stored && supported) locale = stored;
  }
  syncDocumentLang(locale);

  /** Starts a lazy load for `name` and tells the listeners when it arrives. */
  const ensureLoaded = (name: string) => {
    if (!store.lazy || store.isLoaded(name, locale)) return;
    const requested = locale;
    store
      .load(name, requested)
      .then(() => {
        // A newer locale may have been chosen while the module downloaded.
        if (requested === locale) notify();
      })
      .catch((error) => console.error(`[dialex] Could not load dictionary "${name}".`, error));
  };

  const read = (name: string) => {
    ensureLoaded(name);
    return readDictionary(store, name, locale, store.lazy);
  };

  return {
    get locale() {
      return locale;
    },
    config: store.config,
    store,
    setLocale(next) {
      if (next === locale) return;
      locale = next;
      writePersistedLocale(persist, storageKey, next);
      syncDocumentLang(next);
      onLocaleChange?.(next);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getDictionary: ((name: string) => read(name)) as Dialex["getDictionary"],
    t(...dictionaryNames) {
      // The returned function reads the locale when it is called, so it can be kept in a field.
      return ((path: string, ...args: any[]) => {
        for (const name of dictionaryNames) ensureLoaded(name);
        return (createT(read, locale) as any)(path, ...args);
      }) as Translate;
    },
  };
}

/**
 * Re-renders a Lit element when the locale changes, and gives it the dictionaries:
 *
 * ```ts
 * import { i18n } from "./i18n";
 *
 * class CartTitle extends LitElement {
 *   private dx = new DialexController(this, i18n);
 *
 *   render() {
 *     const t = this.dx.t("cart");
 *     return html`<h2>${t("cart.title")}</h2>`;
 *   }
 * }
 * ```
 *
 * It works with any host that implements `ReactiveControllerHost`.
 */
export class DialexController implements ReactiveController {
  private unsubscribe?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    readonly dialex: Dialex,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.dialex.subscribe(() => this.host.requestUpdate());
  }

  hostDisconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** The active locale. */
  get locale(): string {
    return this.dialex.locale;
  }

  setLocale(locale: string): void {
    this.dialex.setLocale(locale);
  }

  /** The dictionary for the active locale. */
  dictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T {
    return this.dialex.getDictionary(name);
  }

  /** A `t("dictionary.key.path", ...args)` bound to the active locale. */
  t(...dictionaryNames: string[]): Translate {
    return this.dialex.t(...dictionaryNames);
  }
}
