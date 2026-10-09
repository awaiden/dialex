import { createT, type DialexSource, type Locales, type Translate } from "./index.js";
import type { DictionaryRegistry } from "./react.js";
import { lookupLocale } from "./resolver.js";
import { createDictionaryStore } from "./store.js";

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export interface DialexServer {
  /**
   * Retrieves a dictionary for Server Components or Node.js servers.
   * @param name The dictionary name (e.g. "home")
   * @param locale The desired locale (defaults to the configured default locale)
   */
  getDictionary: <K extends DictionaryKey, T = ResolveDictionaryType<K>>(
    name: K,
    locale?: Locales,
  ) => T;
  /** Builds a `t("dictionary.key.path", ...args)` function for a locale. */
  getT: (locale?: Locales) => Translate;
}

/**
 * Binds the generated `dialex` export to `getDictionary` and `getT` for server code. Create it
 * once, for example in `src/dialex.ts`, and import the helpers from there.
 *
 * ```ts
 * import { dialex } from "./dialex.generated";
 * export const { getDictionary, getT } = createDialexServer(dialex);
 * ```
 *
 * Needs the eager (default) generated file; lazy dictionaries are for client bundles.
 */
export function createDialexServer(source: DialexSource): DialexServer {
  const { dictionaries, config } = createDictionaryStore(source);

  function getDictionary(name: string, locale?: Locales): any {
    const dict = dictionaries[name];

    if (!dict) {
      console.warn(`[dialex] Dictionary "${name}" not found.`);
      return {};
    }

    const defaultLocale = config.defaultLocale || Object.keys(dict)[0] || "en";
    const targetLocale = (locale as string) || defaultLocale;
    const found = lookupLocale(dict, targetLocale, { fallbacks: config.fallbacks, defaultLocale });
    if (!found) return {};

    if (found.locale !== targetLocale) {
      console.warn(
        `[dialex] Locale "${targetLocale}" not found in dictionary "${name}", using "${found.locale}".`,
      );
    }
    return found.content;
  }

  function getT(locale?: Locales): Translate {
    return createT(
      (name) => getDictionary(name, locale),
      (locale as string | undefined) ?? config.defaultLocale,
    );
  }

  return { getDictionary, getT } as DialexServer;
}

export type { DictionaryRegistry } from "./react.js";
