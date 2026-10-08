# API Başvurusu

## `dialex`

### `defineConfig(config)`

`dialex.config.ts` dosyasını tiplemek için özdeşlik yardımcısı. Bkz. [Yapılandırma](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Bir sözlük tanımlar ve kaydeder. `DictionaryDefinition<N, T>` döndürür: `{ name, dictionary }`.

### Biçimlendirme yardımcıları

`plural`, `number`, `date`, `relativeTime`, `list` ve `formatters(locale)`. Bkz. [Biçimlendirme ve Çoğullar](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Bir [ICU mesajını](../guide/icu.md) biçimlendirir veya ayrıştırır. Çalışma zamanının geri kalanı olmadan, `getArguments` ve `isIcuStructured` ile birlikte `dialex/icu` üzerinden de kullanılabilir.

### `createT(getDictionary, locale?)`

Tip güvenli bir `t("dictionary.key.path", ...args)` oluşturur. Bkz. [Anahtar Yolları](../guide/key-paths.md).

### Tipler

| Tip                                         | Açıklama                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `I18nConfig`                                | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate` |
| `Translate`, `TranslationPath`              | `t` işlevinin tipleri ve geçerli yolları                                                               |
| `Register`                                  | Üretilen bildirimlerle genişletilir (`locales`)                                                        |
| `Locales`                                   | Yapılandırılmış yerel ayarların birleşimi veya `string`                                                |
| `DictionaryRegistry`                        | Sözlük adlarınız ve içerik tiplerinizle genişletilir                                                   |
| `DictionaryKey`, `ResolveDictionaryType<K>` | Anahtar ve içerik tipleme yardımcıları                                                                 |
| `Dictionary<T>`                             | `Record<Locales, T>`                                                                                   |
| `DictionaryDefinition<N, T>`                | `defineDictionary` dönüş tipi                                                                          |
| `globalDictionaries`                        | `defineDictionary` ile doldurulan işlem içi kayıt defteri                                              |

## `dialex/server`

`getDictionary(name, locale?)` bir yerel ayar için sözlük içeriğini, `getT(locale?)` ise bir `t` fonksiyonunu döndürür. Bkz. [Next.js](../frameworks/nextjs.md).

## `dialex/react`

`I18nProvider`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries`. Bkz. [React / Vite](../frameworks/react.md).

## `dialex/vite`

`i18nPlugin(inlineConfig?)`. Bkz. [React / Vite](../frameworks/react.md).

## `dialex/next`

`withI18n(nextConfig, inlineConfig?)`. Bkz. [Next.js](../frameworks/nextjs.md).

## `dialex/vue` ve `dialex/nuxt`

`createI18n`, `useI18n`, `useDictionary`, `useT`, `preloadDictionaries` ve Nuxt modülü. Bkz. [Vue / Nuxt](../frameworks/vue.md).

## Sunucu adaptörleri

`dialex/express` (`i18n`), `dialex/fastify` (`i18nPlugin`), `dialex/koa` (`i18n`), `dialex/hono` (`i18n`), `dialex/nestjs` (`I18nModule` ve ilgili parçalar), `dialex/elysia` (`i18n`), `dialex/sveltekit` (`i18nHandle`), `dialex/astro` (`i18n`). Ortak seçenekler [Yerel Ayar Algılama](../guide/locale-detection.md#options) sayfasındadır.

## `dialex/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Bkz. [Yönlendirme Yardımcıları](../guide/routing.md).

## `dialex/next/middleware` ve `dialex/next/link`

`createI18nMiddleware(options)` ve `I18nLink`. Bkz. [Next.js](../frameworks/nextjs.md).

## `dialex/angular`

`provideDialex`, `injectI18n`, `injectDictionary`, `injectT`, `DIALEX`. Bkz. [Angular](../frameworks/angular.md).

## `dialex/web` ve `dialex/h3`

Herhangi bir `Request` için `createI18nHandler(options)` ve h3 1.x `i18n(options)` middleware'i. Bkz. [Fetch API](../frameworks/web.md) ve [h3 / Nitro](../frameworks/h3.md).

## `dialex/testing`

`createTestI18n`, `mockRequest` ve çerçeve sarmalayıcıları: `TestI18nProvider` (`dialex/testing/react`) ile `createTestI18n` (`dialex/testing/vue`). Bkz. [Test Etme](../guide/testing.md).

## `@dialex/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` ve [VS Code eklentisinin](../guide/vscode.md) üzerine kurulduğu sözlük düzenleme yardımcıları. Sözlükleri ve yapılandırmaları proje kodunu çalıştırmadan sözdizimi ağacından okurlar.

## `dialex/scanner`

Bir `dictionaries` seçeneği verilmediğinde adaptörlerin kullandığı çalışma zamanı sözlük taraması. Üretimde `dialex generate` ile derlenmiş kayıt defterini tercih edin.
