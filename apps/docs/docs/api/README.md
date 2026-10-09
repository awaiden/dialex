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

| Type                                        | Description                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DialexConfig`                              | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate` |
| `Translate`, `TranslationPath`              | Types of `t` and its valid paths                                                                       |
| `Register`                                  | Augmented by generated declarations (`locales`)                                                        |
| `Locales`                                   | Union of configured locales, or `string`                                                               |
| `DictionaryRegistry`                        | Augmented with your dictionary names and content types                                                 |
| `DictionaryKey`, `ResolveDictionaryType<K>` | Key and content typing helpers                                                                         |
| `Dictionary<T>`                             | `Record<Locales, T>`                                                                                   |
| `DictionaryDefinition<N, T>`                | Return type of `defineDictionary`                                                                      |
| `globalDictionaries`                        | In-process registry populated by `defineDictionary`                                                    |

## `dialexjs/server`

`getDictionary(name, locale?)` returns the dictionary content for a locale and `getT(locale?)` returns a `t` function. See [Next.js](../frameworks/nextjs.md).

## `dialexjs/react`

`I18nProvider`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries`. See [React / Vite](../frameworks/react.md).

## `dialexjs/vite`

`i18nPlugin(inlineConfig?)`. See [React / Vite](../frameworks/react.md).

## `dialexjs/next`

`withI18n(nextConfig, inlineConfig?)`. See [Next.js](../frameworks/nextjs.md).

## `dialexjs/vue` and `dialexjs/nuxt`

`createI18n`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries`, and the Nuxt module. See [Vue / Nuxt](../frameworks/vue.md).

## Server adapters

`dialexjs/express` (`i18n`), `dialexjs/fastify` (`i18nPlugin`), `dialexjs/koa` (`i18n`), `dialexjs/hono` (`i18n`), `dialexjs/nestjs` (`I18nModule` and friends), `dialexjs/elysia` (`i18n`), `dialexjs/sveltekit` (`i18nHandle`), `dialexjs/astro` (`i18n`). Shared options are in [Locale Detection](../guide/locale-detection.md#options).

## `dialexjs/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. See [Routing Helpers](../guide/routing.md).

## `dialexjs/next/middleware` and `dialexjs/next/link`

`createI18nMiddleware(options)` and `I18nLink`. See [Next.js](../frameworks/nextjs.md).

## `dialexjs/angular`

`provideDialex`, `injectI18n`, `injectDictionary`, `injectT`, `DIALEX`. See [Angular](../frameworks/angular.md).

## `dialexjs/web` and `dialexjs/h3`

`createI18nHandler(options)` for any `Request`, and the h3 1.x `i18n(options)` middleware. See [Fetch API](../frameworks/web.md) and [h3 / Nitro](../frameworks/h3.md).

## `dialexjs/testing`

`createTestI18n`, `mockRequest`, and the framework wrappers `TestI18nProvider` (`dialexjs/testing/react`) and `createTestI18n` (`dialexjs/testing/vue`). See [Testing](../guide/testing.md).

## `@dialexjs/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` and the dictionary editing helpers the [VS Code extension](../guide/vscode.md) is built on. They read dictionaries and configs from the syntax tree without running project code.

## `dialexjs/scanner`

Runtime dictionary scanning used by adapters when no `dictionaries` option is passed. Prefer the compiled registry from `dialex generate` in production.
