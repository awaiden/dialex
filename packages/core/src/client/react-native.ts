import { createElement, useEffect, useState, type ReactNode } from "react";

import { resolveLocaleFromCandidates } from "../core/resolver.js";
import type { DialexSource } from "../index.js";
import { DialexProvider as ReactDialexProvider } from "./react.js";

export {
  preloadDictionaries,
  useDialex,
  useDialexConfig,
  useDictionary,
  useT,
  type DictionaryRegistry,
} from "./react.js";

/** Anything shaped like `@react-native-async-storage/async-storage`, MMKV or `localStorage`. */
export interface LocaleStorage {
  getItem(key: string): string | null | undefined | Promise<string | null | undefined>;
  setItem(key: string, value: string): void | Promise<void>;
}

/**
 * Props of the React Native `DialexProvider`: the generated `dialex` object, the device's languages and an async storage for the user's choice.
 */
export interface DialexProviderProps extends DialexSource {
  children?: ReactNode;
  /**
   * The device's preferred languages, most preferred first. With Expo:
   * `getLocales().map((locale) => locale.languageTag)` from `expo-localization`.
   * The first one that matches a configured locale is used until the user picks one.
   */
  deviceLocales?: string | string[];
  /** Locale used when nothing else decides. Falls back to the config, then `"en"`. */
  defaultLocale?: string;
  /** The locale to start with. Wins over `deviceLocales` and over the stored locale. */
  initialLocale?: string;
  /**
   * Where the user's choice is remembered. Without it the choice lasts until the app restarts.
   * Children render once it has been read, so the first render is already in the right language.
   */
  storage?: LocaleStorage;
  /**
   * Storage key.
   * @default "locale"
   */
  storageKey?: string;
  /** Called after the locale changes. */
  onLocaleChange?: (locale: string) => void;
}

/**
 * The provider for React Native and Expo. It picks the first locale of `deviceLocales` that the
 * app supports, applies the one remembered in `storage`, and writes the choice back:
 *
 * ```tsx
 * import AsyncStorage from "@react-native-async-storage/async-storage";
 * import { getLocales } from "expo-localization";
 * import { DialexProvider } from "dialexjs/react-native";
 * import { dialex } from "./dialex.generated";
 *
 * export default function Root() {
 *   return (
 *     <DialexProvider
 *       {...dialex}
 *       deviceLocales={getLocales().map((locale) => locale.languageTag)}
 *       storage={AsyncStorage}
 *     >
 *       <App />
 *     </DialexProvider>
 *   );
 * }
 * ```
 *
 * `useDictionary`, `useT` and `useDialex` are the same hooks as in `dialexjs/react`.
 */
export function DialexProvider({
  children,
  deviceLocales,
  initialLocale,
  storage,
  storageKey = "locale",
  onLocaleChange,
  ...source
}: DialexProviderProps) {
  const locales = source.config?.locales;
  const defaultLocale = source.defaultLocale ?? source.config?.defaultLocale ?? "en";

  // With a storage, the remembered locale is read before anything renders, so the first render is
  // already in the right language and restoring it is not reported as a change.
  const [stored, setStored] = useState<string | null | undefined>(
    storage && !initialLocale ? undefined : null,
  );
  useEffect(() => {
    if (stored !== undefined || !storage) return;
    let active = true;
    void (async () => {
      let value: string | null | undefined;
      try {
        value = await storage.getItem(storageKey);
      } catch {
        // An unreadable store behaves like an empty one.
      }
      if (active) setStored(value ?? null);
    })();
    return () => {
      active = false;
    };
    // Only on mount: later changes go through setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stored === undefined) return null;

  const supportedStored = stored && (!locales?.length || locales.includes(stored)) ? stored : null;
  const candidates = Array.isArray(deviceLocales) ? deviceLocales : [deviceLocales];
  const start =
    initialLocale ||
    supportedStored ||
    (deviceLocales ? resolveLocaleFromCandidates(candidates, locales, defaultLocale) : undefined);

  return createElement(ReactDialexProvider, {
    ...source,
    // Without a document there is nothing for the web persistence modes to do.
    persist: false,
    initialLocale: start,
    children,
    onLocaleChange(next: string) {
      if (storage) {
        void Promise.resolve(storage.setItem(storageKey, next)).catch(() => {
          // Persistence is a convenience.
        });
      }
      onLocaleChange?.(next);
    },
  });
}
