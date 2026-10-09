# Referencia de la API

## `dialexjs`

### `defineConfig(config)`

Helper de identidad para tipar `dialex.config.ts`. Consulta [Configuración](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Define y registra un diccionario. Devuelve `DictionaryDefinition<N, T>`: `{ name, dictionary }`.

### Helpers de formato

`plural`, `number`, `date`, `relativeTime`, `list` y `formatters(locale)`. Consulta [Formato y plurales](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Formatean o analizan un [mensaje ICU](../guide/icu.md). También están disponibles, sin el resto del runtime, en `dialexjs/icu` junto con `getArguments` e `isIcuStructured`.

### `createT(getDictionary, locale?)`

Construye un `t("dictionary.key.path", ...args)` con tipos. Consulta [Rutas de claves](../guide/key-paths.md).

### Tipos

| Tipo                                                      | Descripción                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DialexConfig`                                            | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate`             |
| `DEFAULT_CONFIG`                                          | Valores por defecto cuando falta un ajuste, o todo el archivo de configuración                                     |
| `DialexSource`, `DialexClientConfig`, `DictionaryLoaders` | El export `dialex` generado y sus partes: `dictionaries`, un `config` seguro para el cliente y `loaders` diferidos |
| `Translate`, `TranslationPath`                            | Tipos de `t` y de sus rutas válidas                                                                                |
| `Register`                                                | Ampliado por las declaraciones generadas (`locales`)                                                               |
| `Locales`                                                 | Unión de los locales configurados, o `string`                                                                      |
| `DictionaryRegistry`                                      | Ampliado con los nombres y los tipos de contenido de tus diccionarios                                              |
| `DictionaryKey`, `ResolveDictionaryType<K>`               | Helpers de tipado de claves y contenido                                                                            |
| `Dictionary<T>`                                           | `Record<Locales, T>`                                                                                               |
| `DictionaryDefinition<N, T>`                              | Tipo de retorno de `defineDictionary`                                                                              |
| `globalDictionaries`                                      | Registro en proceso que rellena `defineDictionary`                                                                 |

## `dialexjs/server`

`createDialexServer(dialex)` enlaza el export `dialex` generado y devuelve `{ getDictionary, getT }`: `getDictionary(name, locale?)` devuelve el contenido del diccionario para un locale y `getT(locale?)` devuelve una función `t`. Consulta [Next.js](../frameworks/nextjs.md).

## `dialexjs/react`

`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`. Consulta [React / Vite](../frameworks/react.md).

## `dialexjs/vue` y `dialexjs/nuxt`

`createDialex`, `useDialex`, `useDictionary`, `useT`, `preloadDictionaries` y el módulo de Nuxt. Consulta [Vue / Nuxt](../frameworks/vue.md).

## Adaptadores de servidor

`dialexjs/express` (`dialex`), `dialexjs/fastify` (`dialexPlugin`), `dialexjs/koa` (`dialex`), `dialexjs/hono` (`dialex`), `dialexjs/nestjs` (`DialexModule` y compañía), `dialexjs/elysia` (`dialex`), `dialexjs/sveltekit` (`dialexHandle`), `dialexjs/astro` (`dialex`). Las opciones compartidas están en [Detección de locale](../guide/locale-detection.md#options).

## `dialexjs/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Consulta [Helpers de enrutamiento](../guide/routing.md).

## `dialexjs/next/middleware` y `dialexjs/next/link`

`createDialexMiddleware(options)` e `DialexLink`. Consulta [Next.js](../frameworks/nextjs.md).

## `dialexjs/angular`

`provideDialex`, `injectDialex`, `injectDictionary`, `injectT`, `DIALEX`. Consulta [Angular](../frameworks/angular.md).

## `dialexjs/web` y `dialexjs/h3`

`createDialexHandler(options)` para cualquier `Request`, y el middleware `dialex(options)` de h3 1.x. Consulta [Fetch API](../frameworks/web.md) y [h3 / Nitro](../frameworks/h3.md).

## `dialexjs/testing`

`createTestDialex`, `mockRequest` y los envoltorios para frameworks `TestDialexProvider` (`dialexjs/testing/react`) y `createTestDialex` (`dialexjs/testing/vue`). Consulta [Pruebas](../guide/testing.md).

## `@dialexjs/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` y los helpers de edición de diccionarios sobre los que está construida la [extensión de VS Code](../guide/vscode.md). Leen los diccionarios y las configuraciones del árbol sintáctico sin ejecutar código del proyecto.

## `dialexjs/scanner`

Análisis de diccionarios en tiempo de ejecución que usan los adaptadores cuando no se pasa la opción `dictionaries`. En producción, prefiere el registro compilado con `dialex generate`.
