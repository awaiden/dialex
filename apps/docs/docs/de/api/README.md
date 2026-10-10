# API-Referenz

## `dialexjs`

### `defineConfig(config)`

Identitätshelfer zum Typisieren von `dialex.config.ts`. Siehe [Konfiguration](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Definiert und registriert ein Wörterbuch. Liefert `DictionaryDefinition<N, T>`: `{ name, dictionary }`.

### Formatierungshelfer

`plural`, `number`, `date`, `relativeTime`, `list` und `formatters(locale)`. Siehe [Formatierung und Plurale](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Formatieren oder parsen eine [ICU-Nachricht](../guide/icu.md). Auch ohne den Rest der Laufzeit verfügbar, über `dialexjs/icu` zusammen mit `getArguments` und `isIcuStructured`.

### `createT(getDictionary, locale?)`

Erzeugt ein typisiertes `t("dictionary.key.path", ...args)`. Siehe [Schlüsselpfade](../guide/key-paths.md).

### Typen

| Typ                                                       | Beschreibung                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `DialexConfig`                                            | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate`         |
| `DEFAULT_CONFIG`                                          | Standardwerte, wenn eine Einstellung oder die ganze Konfigurationsdatei fehlt                                  |
| `DialexSource`, `DialexClientConfig`, `DictionaryLoaders` | Der generierte Export `dialex` und seine Teile: `dictionaries`, eine clientsichere `config` und lazy `loaders` |
| `Translate`, `TranslationPath`                            | Typen von `t` und seinen gültigen Pfaden                                                                       |
| `Register`                                                | Wird durch generierte Deklarationen erweitert (`locales`)                                                      |
| `Locales`                                                 | Union der konfigurierten Locales oder `string`                                                                 |
| `DictionaryRegistry`                                      | Wird um deine Wörterbuchnamen und Inhaltstypen erweitert                                                       |
| `DictionaryKey`, `ResolveDictionaryType<K>`               | Typhelfer für Schlüssel und Inhalt                                                                             |
| `Dictionary<T>`                                           | `Record<Locales, T>`                                                                                           |
| `DictionaryDefinition<N, T>`                              | Rückgabetyp von `defineDictionary`                                                                             |
| `globalDictionaries`                                      | Prozessinterne Registry, die `defineDictionary` befüllt                                                        |

## `dialexjs/server`

`createDialexServer(dialex)` bindet den generierten Export `dialex` und liefert `{ getDictionary, getT }`: `getDictionary(name, locale?)` gibt den Wörterbuchinhalt für ein Locale zurück und `getT(locale?)` eine `t`-Funktion. Siehe [Next.js](../frameworks/nextjs.md).

## `dialexjs/react`

`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`. Siehe [React / Vite](../frameworks/react.md).

## `dialexjs/vue` und `dialexjs/nuxt`

`createDialex`, `useDialex`, `useDictionary`, `useT`, `preloadDictionaries` und das Nuxt-Modul. Siehe [Vue / Nuxt](../frameworks/vue.md).

## Server-Adapter

`dialexjs/express` (`dialex`), `dialexjs/fastify` (`dialexPlugin`), `dialexjs/koa` (`dialex`), `dialexjs/hono` (`dialex`), `dialexjs/nestjs` (`DialexModule` und Zubehör), `dialexjs/elysia` (`dialex`), `dialexjs/sveltekit` (`dialexHandle`), `dialexjs/astro` (`dialex`). Gemeinsame Optionen stehen unter [Locale-Erkennung](../guide/locale-detection.md#options).

## `dialexjs/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Siehe [Routing-Helfer](../guide/routing.md).

## `dialexjs/next/middleware` und `dialexjs/next/link`

`createDialexMiddleware(options)` und `DialexLink`. Siehe [Next.js](../frameworks/nextjs.md).

## `dialexjs/angular`

`provideDialex`, `injectDialex`, `injectDictionary`, `injectT`, `DIALEX`. Siehe [Angular](../frameworks/angular.md).

## `dialexjs/web` und `dialexjs/h3`

`createDialexHandler(options)` für jeden `Request` sowie die h3-1.x-Middleware `dialex(options)`. Siehe [Fetch API](../frameworks/web.md) und [h3 / Nitro](../frameworks/h3.md).

## `dialexjs/testing`

`createTestDialex`, `mockRequest` sowie die Framework-Wrapper `TestDialexProvider` (`dialexjs/testing/react`) und `createTestDialex` (`dialexjs/testing/vue`). Siehe [Testen](../guide/testing.md).

## `@dialexjs/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` und die Helfer zum Bearbeiten von Wörterbüchern, auf denen die [VS-Code-Erweiterung](../guide/vscode.md) aufbaut. Sie lesen Wörterbücher und Konfigurationen aus dem Syntaxbaum, ohne Projektcode auszuführen.
