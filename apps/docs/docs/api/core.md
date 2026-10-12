# Core

The `dialexjs` entry point: configuration, dictionaries and the `t` function. The formatting helpers are on [Formatting](./formatting.md), the types on [Types](./types.md).

## `defineConfig(config)`

```ts
function defineConfig(config: DialexConfig): DialexConfig;
```

Gives `dialex.config.ts` its types and returns the object unchanged.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
```

See [Configuration](../guide/configuration.md) for every option.

## `defineDictionary(name, dictionary)`

```ts
function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;

function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
```

| Parameter    | Description                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | The dictionary name: the first segment of every `t()` path and the argument of `getDictionary`. It must be unique and a literal |
| `dictionary` | An object that maps each locale to its content: strings, nested objects, or functions                                           |

It registers the dictionary in [`globalDictionaries`](#globaldictionaries) and returns `{ name, dictionary }`. Put each dictionary in its own `*.content.ts` file as the default export, so `dialex generate` finds it. See [Dictionaries](../guide/dictionaries.md).

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Welcome", greeting: (name: string) => `Hello, ${name}!` },
  tr: { title: "Hoş geldiniz", greeting: (name: string) => `Merhaba, ${name}!` },
});
```

<a id="createt"></a>

## `createT(getDictionary, locale?)`

```ts
function createT(getDictionary: (name: any) => any, locale?: string): Translate;
```

Builds a `t("dictionary.key.path", ...args)` function on top of a `getDictionary(name)` accessor. The framework adapters do this for you; call it yourself in a script or a test.

| Parameter       | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `getDictionary` | Returns the content of the dictionary called `name` for the locale |
| `locale`        | The locale used to format ICU messages. Default `"en"`             |

What `t(path, ...args)` returns:

| The path leads to                         | Result                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| A function                                | `fn(...args)`: the extra arguments go to the function                          |
| A string and no values object             | The string as it is. Nothing is parsed                                         |
| A string and a values object (`{ n: 3 }`) | The string formatted as an [ICU message](../guide/icu.md) for `locale`         |
| Nothing                                   | `console.warn("[dialex] Translation path ... not found.")` and the path itself |

A string that cannot be formatted (invalid ICU, or a missing value) is reported with `console.warn` and returned unchanged, so one bad string never crashes a page. See [Key Paths](../guide/key-paths.md).

## `globalDictionaries`

```ts
const globalDictionaries: Record<string, Record<string, any>>;
```

The in-process registry that `defineDictionary` fills. Adapters read it when you do not pass `dictionaries` to them. It is empty until the dictionary files have been imported, which is why the generated `dialex` object is the reliable way to pass dictionaries.

## `DEFAULT_CONFIG`

```ts
const DEFAULT_CONFIG: {
  defaultLocale: string; // "en"
  locales: string[]; // []
  include: string | string[]; // "**/*.content.ts"
  fallbacks: Record<string, string[]>; // {}
  prefixDefault: boolean; // true
  lazy: boolean | "locale"; // false
};
```

What every tool uses for a setting, or the whole config file, that is missing. `locales` is empty: `dialex generate` then uses the locales your dictionaries define.

## Configuration types

### `DialexConfig`

The shape of `dialex.config.ts`. Every field is optional.

| Field           | Type                       | Default             | Description                                                                           |
| --------------- | -------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                   | `"en"`              | Locale used when none can be resolved                                                 |
| `locales`       | `string[]`                 | —                   | Supported locales                                                                     |
| `include`       | `string \| string[]`       | `"**/*.content.ts"` | Glob(s) of the dictionary files                                                       |
| `exclude`       | `string[]`                 | —                   | Globs that are never scanned, on top of `node_modules`, build output and `.gitignore` |
| `output`        | `string`                   | `src/` or the root  | Where `dialex.generated.ts` is written                                                |
| `configFile`    | `string`                   | —                   | Custom path of the config file                                                        |
| `fallbacks`     | `Record<string, string[]>` | —                   | Explicit [fallback chains](../guide/fallbacks.md)                                     |
| `prefixDefault` | `boolean`                  | `true`              | Whether the default locale also gets a URL prefix                                     |
| `lazy`          | `boolean \| "locale"`      | `false`             | Load dictionaries on demand. See [Lazy Loading](../guide/lazy-loading.md)             |
| `lint`          | `LintConfig`               | —                   | Level and options of each check. See [Linting](../guide/linting.md)                   |
| `translate`     | `TranslateConfig`          | —                   | Settings of [`dialex translate`](../cli/translate.md)                                 |

### `LintConfig`

| Field   | Type                              | Description                                                                    |
| ------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `rules` | `Record<string, LintRuleSetting>` | Level and options per diagnostic code, plus `dynamic-key` and `literal-string` |

A `LintRuleSetting` is a `LintSeverity` (`"off"`, `"warn"` or `"error"`), or `[LintSeverity, options]` for checks that take options. `dialex check`, the editors and [`@dialexjs/eslint-plugin`](../guide/linting.md) all read it.

### `TranslateConfig`

| Field          | Type                | Description                                               |
| -------------- | ------------------- | --------------------------------------------------------- |
| `provider`     | `TranslateProvider` | The backend that translates strings. Required             |
| `sourceLocale` | `string`            | The locale to translate from. Defaults to `defaultLocale` |

### `TranslateProvider`

```ts
interface TranslateProvider {
  name?: string;
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}
```

`translate` receives plain strings and must return one translation per input, in the same order. Set `supportsIcu` only when the provider keeps the structure of `plural` and `select` messages intact; messages with that syntax are not sent to providers that do not. See [`dialex translate`](../cli/translate.md).

## Generated file types

| Type                 | Description                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexSource`       | What the generated `dialex` export holds and providers accept: `dictionaries`, `config` and, in lazy mode, `loaders`                                              |
| `DialexClientConfig` | The settings `dialex generate` copies into `dialex.generated.ts`: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`. `translate` is never included |
| `DictionaryLoader`   | `() => Promise<any>`: loads one dictionary, or one locale of it                                                                                                   |
| `DictionaryLoaders`  | Loaders by dictionary name. With `lazy: "locale"` a dictionary maps each locale to its own loader                                                                 |
