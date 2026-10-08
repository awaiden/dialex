# API-Referenz

## `dialex`

### `defineConfig(config)`

Identitätshelfer zum Typisieren von `dialex.config.ts`. Siehe [Konfiguration](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Definiert und registriert ein Wörterbuch. Liefert `DictionaryDefinition<N, T>`: `{ name, dictionary }`.

### Formatierungshelfer

`plural`, `number`, `date`, `relativeTime`, `list` und `formatters(locale)`. Siehe [Formatierung und Plurale](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Formatieren oder parsen eine [ICU-Nachricht](../guide/icu.md). Auch ohne den Rest der Laufzeit verfügbar, über `dialex/icu` zusammen mit `getArguments` und `isIcuStructured`.

### `createT(getDictionary, locale?)`

Erzeugt ein typisiertes `t("dictionary.key.path", ...args)`. Siehe [Schlüsselpfade](../guide/key-paths.md).

### Typen

| Typ                                         | Beschreibung                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `I18nConfig`                                | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate` |
| `Translate`, `TranslationPath`              | Typen von `t` und seinen gültigen Pfaden                                                               |
| `Register`                                  | Wird durch generierte Deklarationen erweitert (`locales`)                                              |
| `Locales`                                   | Union der konfigurierten Locales oder `string`                                                         |
| `DictionaryRegistry`                        | Wird um deine Wörterbuchnamen und Inhaltstypen erweitert                                               |
| `DictionaryKey`, `ResolveDictionaryType<K>` | Typhelfer für Schlüssel und Inhalt                                                                     |
| `Dictionary<T>`                             | `Record<Locales, T>`                                                                                   |
| `DictionaryDefinition<N, T>`                | Rückgabetyp von `defineDictionary`                                                                     |
| `globalDictionaries`                        | Prozessinterne Registry, die `defineDictionary` befüllt                                                |

## `dialex/server`

`getDictionary(name, locale?)` liefert den Wörterbuchinhalt für ein Locale, und `getT(locale?)` liefert eine `t`-Funktion. Siehe [Next.js](../frameworks/nextjs.md).

## `dialex/react`

`I18nProvider`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries`. Siehe [React / Vite](../frameworks/react.md).

## `dialex/vite`

`i18nPlugin(inlineConfig?)`. Siehe [React / Vite](../frameworks/react.md).

## `dialex/next`

`withI18n(nextConfig, inlineConfig?)`. Siehe [Next.js](../frameworks/nextjs.md).

## `dialex/vue` und `dialex/nuxt`

`createI18n`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries` und das Nuxt-Modul. Siehe [Vue / Nuxt](../frameworks/vue.md).

## Server-Adapter

`dialex/express` (`i18n`), `dialex/fastify` (`i18nPlugin`), `dialex/koa` (`i18n`), `dialex/hono` (`i18n`), `dialex/nestjs` (`I18nModule` und Zubehör), `dialex/elysia` (`i18n`), `dialex/sveltekit` (`i18nHandle`), `dialex/astro` (`i18n`). Gemeinsame Optionen stehen unter [Locale-Erkennung](../guide/locale-detection.md#options).

## `dialex/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Siehe [Routing-Helfer](../guide/routing.md).

## `dialex/next/middleware` und `dialex/next/link`

`createI18nMiddleware(options)` und `I18nLink`. Siehe [Next.js](../frameworks/nextjs.md).

## `dialex/angular`

`provideDialex`, `injectI18n`, `injectDictionary`, `injectT`, `DIALEX`. Siehe [Angular](../frameworks/angular.md).

## `dialex/web` und `dialex/h3`

`createI18nHandler(options)` für jeden `Request` sowie die h3-1.x-Middleware `i18n(options)`. Siehe [Fetch API](../frameworks/web.md) und [h3 / Nitro](../frameworks/h3.md).

## `dialex/testing`

`createTestI18n`, `mockRequest` sowie die Framework-Wrapper `TestI18nProvider` (`dialex/testing/react`) und `createTestI18n` (`dialex/testing/vue`). Siehe [Testen](../guide/testing.md).

## `@dialex/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` und die Helfer zum Bearbeiten von Wörterbüchern, auf denen die [VS-Code-Erweiterung](../guide/vscode.md) aufbaut. Sie lesen Wörterbücher und Konfigurationen aus dem Syntaxbaum, ohne Projektcode auszuführen.

## `dialex/scanner`

Wörterbuch-Scan zur Laufzeit, den die Adapter verwenden, wenn keine Option `dictionaries` übergeben wird. Bevorzuge in Produktion die mit `dialex generate` kompilierte Registry.
