export * from "./format.js";
export {
  formatMessage,
  parseMessage,
  IcuFormatError,
  IcuSyntaxError,
  type IcuNode,
  type IcuValue,
  type IcuValues,
} from "./icu/index.js";
export {
  createT,
  type PathsOf,
  type Translate,
  type TranslationArgs,
  type TranslationPath,
  type TranslationResult,
} from "./translate.js";

/**
 * A machine-translation backend used by `dialex translate`.
 * `texts` are plain strings; implementations must return one translation per input, in order.
 */
export interface TranslateProvider {
  name?: string;
  /**
   * Whether the provider can translate ICU plural/select messages without breaking their
   * structure. Messages with such syntax are skipped for providers that do not.
   */
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}

export interface TranslateConfig {
  /** Backend used to fill missing translations. */
  provider: TranslateProvider;
  /** Locale to translate from. Defaults to `defaultLocale`. */
  sourceLocale?: string;
}

export interface I18nConfig {
  /**
   * The default locale to use.
   * @default 'en'
   */
  defaultLocale?: string;
  /**
   * List of supported locales.
   */
  locales?: string[];
  /**
   * Glob pattern to find dictionary files.
   * @default '**\/*.content.ts'
   */
  include?: string | string[];
  /**
   * Custom path to configuration file.
   */
  configFile?: string;
  /**
   * Explicit fallback chains per locale, e.g. `{ "pt-BR": ["pt", "es"] }`.
   * Region subtags are truncated automatically and `defaultLocale` is always tried last.
   */
  fallbacks?: Record<string, string[]>;
  /**
   * Whether the default locale also gets a URL prefix (`/en/about`). When `false` it is served
   * from the unprefixed path. Read by `I18nLink`; pass the same value to the Next.js middleware.
   * @default true
   */
  prefixDefault?: boolean;
  /**
   * Load dictionaries on demand instead of bundling them all up front (Vite only).
   * Dictionaries are split per file. See the lazy loading guide.
   * @default false
   */
  lazy?: boolean;
  /**
   * Settings for `dialex translate`. Nothing is sent anywhere unless a provider is configured.
   */
  translate?: TranslateConfig;
}

export function defineConfig(config: I18nConfig): I18nConfig {
  return config;
}

export interface Register {}

export interface DictionaryRegistry {}

export type DictionaryKey = [keyof DictionaryRegistry] extends [never]
  ? string
  : // oxlint-disable-next-line typescript(no-redundant-type-constituents)
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    keyof DictionaryRegistry | (string & {});

export type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry
  ? DictionaryRegistry[K]
  : any;

export type Locales = Register extends { locales: infer L }
  ? L extends string
    ? L
    : string
  : string;

export type Dictionary<T extends Record<string, any>> = Record<Locales, T>;

export interface DictionaryDefinition<N extends string, T extends Record<string, any>> {
  name: N;
  dictionary: Record<string, T>;
}

export const globalDictionaries: Record<string, Record<string, any>> = {};

export function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;
export function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
export function defineDictionary<N extends string, D extends Record<string, any>>(
  nameOrConfig: N | { name: N; dictionary: D },
  maybeDictionary?: D,
): DictionaryDefinition<N, D[keyof D]> {
  if (typeof nameOrConfig === "object" && nameOrConfig !== null) {
    const { name, dictionary } = nameOrConfig;
    globalDictionaries[name] = dictionary as unknown as Record<string, any>;
    return {
      name,
      dictionary: dictionary as unknown as Record<string, D[keyof D]>,
    };
  }

  const name = nameOrConfig;
  const dictionary = maybeDictionary!;
  globalDictionaries[name] = dictionary as unknown as Record<string, any>;
  return {
    name,
    dictionary: dictionary as unknown as Record<string, D[keyof D]>,
  };
}
