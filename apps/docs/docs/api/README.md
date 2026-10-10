# API Reference

## `dialexjs`

### `defineConfig(config)`

Identity helper for typing `dialex.config.ts`. See [Configuration](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Defines and registers a dictionary. Returns `DictionaryDefinition<N, T>`: `{ name, dictionary }`.

### Formatting helpers

`plural`, `number`, `date`, `relativeTime`, `list`, and `formatters(locale)`. See [Formatting & Plurals](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Format or parse an [ICU message](../guide/icu.md). Also available, without the rest of the runtime, from `dialexjs/icu` together with `getArguments` and `isIcuStructured`.

### `createT(getDictionary, locale?)`

Builds a typed `t("dictionary.key.path", ...args)`. See [Key Paths](../guide/key-paths.md).

### Types

| Type                                                      | Description                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DialexConfig`                                            | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate`  |
| `DEFAULT_CONFIG`                                          | Defaults used when a setting, or the whole config file, is missing                                      |
| `DialexSource`, `DialexClientConfig`, `DictionaryLoaders` | The generated `dialex` export and its parts: `dictionaries`, a client-safe `config`, and lazy `loaders` |
| `Translate`, `TranslationPath`                            | Types of `t` and its valid paths                                                                        |
| `Register`                                                | Augmented by generated declarations (`locales`)                                                         |
| `Locales`                                                 | Union of configured locales, or `string`                                                                |
| `DictionaryRegistry`                                      | Augmented with your dictionary names and content types                                                  |
| `DictionaryKey`, `ResolveDictionaryType<K>`               | Key and content typing helpers                                                                          |
| `Dictionary<T>`                                           | `Record<Locales, T>`                                                                                    |
| `DictionaryDefinition<N, T>`                              | Return type of `defineDictionary`                                                                       |
| `globalDictionaries`                                      | In-process registry populated by `defineDictionary`                                                     |

## `dialexjs/server`

`createDialexServer(dialex)` binds the generated `dialex` export and returns `{ getDictionary, getT }`: `getDictionary(name, locale?)` returns the dictionary content for a locale and `getT(locale?)` returns a `t` function. See [Next.js](../frameworks/nextjs.md).

## `dialexjs/react`

`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`. See [React / Vite](../frameworks/react.md).

## `dialexjs/vue` and `dialexjs/nuxt`

`createDialex`, `useDialex`, `useDictionary`, `useT`, `preloadDictionaries`, and the Nuxt module. See [Vue / Nuxt](../frameworks/vue.md).

## Server adapters

`dialexjs/express` (`dialex`), `dialexjs/fastify` (`dialexPlugin`), `dialexjs/koa` (`dialex`), `dialexjs/hono` (`dialex`), `dialexjs/nestjs` (`DialexModule` and friends), `dialexjs/elysia` (`dialex`), `dialexjs/sveltekit` (`dialexHandle`), `dialexjs/astro` (`dialex`). Shared options are in [Locale Detection](../guide/locale-detection.md#options).

## `dialexjs/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. See [Routing Helpers](../guide/routing.md).

## `dialexjs/next/middleware` and `dialexjs/next/link`

`createDialexMiddleware(options)` and `DialexLink`. See [Next.js](../frameworks/nextjs.md).

## `dialexjs/angular`

`provideDialex`, `injectDialex`, `injectDictionary`, `injectT`, `DIALEX`. See [Angular](../frameworks/angular.md).

## `dialexjs/web` and `dialexjs/h3`

`createDialexHandler(options)` for any `Request`, and the h3 1.x `dialex(options)` middleware. See [Fetch API](../frameworks/web.md) and [h3 / Nitro](../frameworks/h3.md).

## `dialexjs/testing`

`createTestDialex`, `mockRequest`, and the framework wrappers `TestDialexProvider` (`dialexjs/testing/react`) and `createTestDialex` (`dialexjs/testing/vue`). See [Testing](../guide/testing.md).

## `@dialexjs/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` and the dictionary editing helpers the [VS Code extension](../guide/vscode.md) is built on. They read dictionaries and configs from the syntax tree without running project code.
