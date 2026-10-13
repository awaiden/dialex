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
