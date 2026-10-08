// @ts-ignore
import dictionaries from "virtual:dialex-dictionaries";
// @ts-ignore
import config from "virtual:dialex-config";
import type { DictionaryRegistry } from "./react.js";
import { createT, type Locales, type Translate } from "./index.js";
import { lookupLocale } from "./resolver.js";

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

/**
 * Retrieves a dictionary content for Server Components or Node.js server environments.
 * @param name The dictionary name (e.g. "home")
 * @param locale The desired locale (defaults to configured defaultLocale or first locale)
 */
export function getDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
  name: K,
  locale?: Locales,
): T {
  const dict = (dictionaries as Record<string, any>)[name as string];

  if (!dict) {
    console.warn(`[dialex] Dictionary "${name as string}" not found.`);
    return {} as T;
  }

  const defaultLocale = config.defaultLocale || Object.keys(dict)[0] || "en";
  const targetLocale = (locale as string) || defaultLocale;
  const found = lookupLocale(dict, targetLocale, { fallbacks: config.fallbacks, defaultLocale });
  if (!found) return {} as T;

  if (found.locale !== targetLocale) {
    console.warn(
      `[dialex] Locale "${targetLocale}" not found in dictionary "${name as string}", using "${found.locale}".`,
    );
  }
  return found.content as T;
}

/**
 * Builds a `t("dictionary.key.path", ...args)` function for a locale (Server Components, Node.js).
 */
export function getT(locale?: Locales): Translate {
  return createT(
    (name) => getDictionary(name, locale),
    (locale as string | undefined) ?? config.defaultLocale,
  );
}

export type { DictionaryRegistry } from "./react.js";
