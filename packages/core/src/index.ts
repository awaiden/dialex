export * from "./core/format.js";
export {
  formatMessage,
  parseMessage,
  IcuFormatError,
  IcuSyntaxError,
  type IcuNode,
  type IcuValue,
  type IcuValues,
} from "./core/icu/index.js";
export {
  createT,
  type PathsOf,
  type Translate,
  type TranslationArgs,
  type TranslationPath,
  type TranslationResult,
} from "./core/translate.js";

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

/**
 * Settings of `dialex translate`. Nothing is sent anywhere unless a `provider` is set.
 */
export interface TranslateConfig {
  /** Backend used to fill missing translations. */
  provider: TranslateProvider;
  /** Locale to translate from. Defaults to `defaultLocale`. */
  sourceLocale?: string;
}

/**
 * What every tool uses when a setting (or the whole `dialex.config.ts`) is missing. `locales` is
 * empty here: `dx generate` then infers it from the dictionaries.
 */
export const DEFAULT_CONFIG = {
  defaultLocale: "en",
  locales: [] as string[],
  include: "**/*.content.ts" as string | string[],
  fallbacks: {} as Record<string, string[]>,
  prefixDefault: true,
  lazy: false as boolean | "locale",
};

/** The settings `dx generate` writes into `dialex.generated.ts` for the runtime to read. */
export interface DialexClientConfig {
  defaultLocale?: string;
  locales?: string[];
  fallbacks?: Record<string, string[]>;
  prefixDefault?: boolean;
  lazy?: boolean | "locale";
}

/** Loads one dictionary, or one locale of it, on demand (`() => import("./home.content.js")`). */
export type DictionaryLoader = () => Promise<any>;

/**
 * Loaders by dictionary name. In `lazy: "locale"` mode a dictionary can instead map each locale to
 * its own loader, so only the locale in use is downloaded.
 */
export type DictionaryLoaders = Record<string, DictionaryLoader | Record<string, DictionaryLoader>>;

/**
 * What the generated `dialex` export holds and providers accept:
 * `<DialexProvider {...dialex}>`, `createDialex({ ...dialex })`, `createDialexServer(dialex)`.
 */
export interface DialexSource {
  /** Dictionary definitions, or a map of name to dictionary. */
  dictionaries?: Record<string, Record<string, any>> | any[];
  config?: DialexClientConfig;
  /** Present in lazy mode. Dictionaries are then loaded the first time they are used. */
  loaders?: DictionaryLoaders;
}

/** How loudly a lint rule reports. `"off"` silences it. */
export type LintSeverity = "off" | "warn" | "error";

/** A severity, or `[severity, options]` for rules that take options. */
export type LintRuleSetting = LintSeverity | [LintSeverity, Record<string, unknown>?];

/**
 * Which checks run and how loudly, shared by `dialex check`, the editor extensions and the
 * `@dialexjs/eslint-plugin` rules. Keys are diagnostic codes such as `"unknown-dictionary"` or
 * `"missing-key"`, plus the lint-only `"dynamic-key"` and `"literal-string"`.
 */
export interface LintConfig {
  rules?: Record<string, LintRuleSetting>;
}

/**
 * The shape of `dialex.config.ts`. Every field is optional. The CLI and the language server read the
 * file from its syntax tree, so use literal values where you can.
 *
 * ```ts
 * import { defineConfig } from "dialexjs";
 *
 * export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
 * ```
 */
export interface DialexConfig {
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
   * Where `dialex generate` writes `dialex.generated.ts`, relative to the project. The type
   * declarations (`dialex-env.d.ts`) are written next to it. Defaults to `src/` when the project
   * has one, otherwise the project root. Useful for frameworks whose source folder is `app/`.
   */
  output?: string;
  /**
   * Globs, relative to the project, that are never scanned for dictionaries or sources, on top of
   * `node_modules`, build output and everything `.gitignore` ignores.
   */
  exclude?: string[];
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
   * from the unprefixed path. Read by `DialexLink`; pass the same value to the Next.js middleware.
   * @default true
   */
  prefixDefault?: boolean;
  /**
   * Load dictionaries on demand instead of bundling them all up front. `true` splits per
   * dictionary file; `"locale"` also splits each dictionary per locale, so only the locale in use
   * is downloaded. See the lazy loading guide.
   * @default false
   */
  lazy?: boolean | "locale";
  /**
   * Severity (`"off"`, `"warn"`, `"error"`) and options of each check, for `dialex check`, the
   * editors and the ESLint/oxlint plugin. Read without running the file.
   * @example { rules: { "unused-key": "off", "missing-key": "warn" } }
   */
  lint?: LintConfig;
  /**
   * Settings for `dialex translate`. Nothing is sent anywhere unless a provider is configured.
   */
  translate?: TranslateConfig;
}

/**
 * Gives `dialex.config.ts` its types. It returns the object unchanged.
 *
 * ```ts
 * export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
 * ```
 */
export function defineConfig(config: DialexConfig): DialexConfig {
  return config;
}

/**
 * Augmented in `dialex-env.d.ts` with `locales`, a tuple of your configured locales, which narrows the `Locales` type.
 */
export interface Register {}

/**
 * Augmented by `dialex generate` (in `dialex-env.d.ts`) with the ICU arguments of each message:
 * `{ "cart.items": { count: number } }`. `t("cart.items", { count })` is then type-checked.
 */
export interface MessageArguments {}

/**
 * Maps dictionary names to their content types. `dialex generate` augments it in `dialex-env.d.ts`,
 * which types `getDictionary("home")` and `t("home.title")`. Leave it empty in your own code.
 */
export interface DictionaryRegistry {}

/**
 * A dictionary name: the registered names with autocomplete, or any `string` before `dialex generate` has run.
 */
export type DictionaryKey = [keyof DictionaryRegistry] extends [never]
  ? string
  : // oxlint-disable-next-line typescript(no-redundant-type-constituents)
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    keyof DictionaryRegistry | (string & {});

/**
 * The content type of the dictionary named `K`, or `any` when it is not registered.
 */
export type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry
  ? DictionaryRegistry[K]
  : any;

/**
 * The union of your configured locales (from `dialex-env.d.ts`), or `string` before `dialex generate` has run.
 */
export type Locales = Register extends { locales: infer L }
  ? L extends string
    ? L
    : string
  : string;

/**
 * A dictionary's content for every configured locale, keyed by locale.
 */
export type Dictionary<T extends Record<string, any>> = Record<Locales, T>;

/**
 * What `defineDictionary` returns: the dictionary's `name` and its content by locale.
 */
export interface DictionaryDefinition<N extends string, T extends Record<string, any>> {
  name: N;
  dictionary: Record<string, T>;
}

/**
 * The registry that `defineDictionary` fills in the current process. Adapters read it when you do not pass `dictionaries` to them.
 */
export const globalDictionaries: Record<string, Record<string, any>> = {};

/**
 * Defines a dictionary and registers it in `globalDictionaries`. Put each one in a `*.content.ts`
 * file; `dialex generate` finds it, compiles it and types it.
 *
 * ```ts
 * export default defineDictionary("home", {
 *   en: { title: "Welcome" },
 *   tr: { title: "Hoş geldiniz" },
 * });
 * ```
 */
export function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;
/**
 * The object form of `defineDictionary`: `defineDictionary({ name: "home", dictionary: { en: {...} } })`.
 */
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
