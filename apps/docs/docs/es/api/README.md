# Referencia de la API

## `dialex`

### `defineConfig(config)`

Helper de identidad para tipar `dialex.config.ts`. Consulta [Configuración](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Define y registra un diccionario. Devuelve `DictionaryDefinition<N, T>`: `{ name, dictionary }`.

### Helpers de formato

`plural`, `number`, `date`, `relativeTime`, `list` y `formatters(locale)`. Consulta [Formato y plurales](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Formatean o analizan un [mensaje ICU](../guide/icu.md). También están disponibles, sin el resto del runtime, en `dialex/icu` junto con `getArguments` e `isIcuStructured`.

### `createT(getDictionary, locale?)`

Construye un `t("dictionary.key.path", ...args)` con tipos. Consulta [Rutas de claves](../guide/key-paths.md).

### Tipos

| Tipo                                        | Descripción                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `I18nConfig`                                | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate` |
| `Translate`, `TranslationPath`              | Tipos de `t` y de sus rutas válidas                                                                    |
| `Register`                                  | Ampliado por las declaraciones generadas (`locales`)                                                   |
| `Locales`                                   | Unión de los locales configurados, o `string`                                                          |
| `DictionaryRegistry`                        | Ampliado con los nombres y los tipos de contenido de tus diccionarios                                  |
| `DictionaryKey`, `ResolveDictionaryType<K>` | Helpers de tipado de claves y contenido                                                                |
| `Dictionary<T>`                             | `Record<Locales, T>`                                                                                   |
| `DictionaryDefinition<N, T>`                | Tipo de retorno de `defineDictionary`                                                                  |
| `globalDictionaries`                        | Registro en proceso que rellena `defineDictionary`                                                     |

## `dialex/server`

`getDictionary(name, locale?)` devuelve el contenido del diccionario para un locale, y `getT(locale?)` devuelve una función `t`. Consulta [Next.js](../frameworks/nextjs.md).

## `dialex/react`

`I18nProvider`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries`. Consulta [React / Vite](../frameworks/react.md).

## `dialex/vite`

`i18nPlugin(inlineConfig?)`. Consulta [React / Vite](../frameworks/react.md).

## `dialex/next`

`withI18n(nextConfig, inlineConfig?)`. Consulta [Next.js](../frameworks/nextjs.md).

## `dialex/vue` y `dialex/nuxt`

`createI18n`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries` y el módulo de Nuxt. Consulta [Vue / Nuxt](../frameworks/vue.md).

## Adaptadores de servidor

`dialex/express` (`i18n`), `dialex/fastify` (`i18nPlugin`), `dialex/koa` (`i18n`), `dialex/hono` (`i18n`), `dialex/nestjs` (`I18nModule` y compañía), `dialex/elysia` (`i18n`), `dialex/sveltekit` (`i18nHandle`), `dialex/astro` (`i18n`). Las opciones compartidas están en [Detección de locale](../guide/locale-detection.md#options).

## `dialex/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Consulta [Helpers de enrutamiento](../guide/routing.md).

## `dialex/next/middleware` y `dialex/next/link`

`createI18nMiddleware(options)` e `I18nLink`. Consulta [Next.js](../frameworks/nextjs.md).

## `dialex/angular`

`provideDialex`, `injectI18n`, `injectDictionary`, `injectT`, `DIALEX`. Consulta [Angular](../frameworks/angular.md).

## `dialex/web` y `dialex/h3`

`createI18nHandler(options)` para cualquier `Request`, y el middleware `i18n(options)` de h3 1.x. Consulta [Fetch API](../frameworks/web.md) y [h3 / Nitro](../frameworks/h3.md).

## `dialex/testing`

`createTestI18n`, `mockRequest` y los envoltorios para frameworks `TestI18nProvider` (`dialex/testing/react`) y `createTestI18n` (`dialex/testing/vue`). Consulta [Pruebas](../guide/testing.md).

## `@dialex/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` y los helpers de edición de diccionarios sobre los que está construida la [extensión de VS Code](../guide/vscode.md). Leen los diccionarios y las configuraciones del árbol sintáctico sin ejecutar código del proyecto.

## `dialex/scanner`

Análisis de diccionarios en tiempo de ejecución que usan los adaptadores cuando no se pasa la opción `dictionaries`. En producción, prefiere el registro compilado con `dialex generate`.
