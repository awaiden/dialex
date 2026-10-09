# API Başvurusu

## `dialexjs`

### `defineConfig(config)`

`dialex.config.ts` dosyasını tiplemek için özdeşlik yardımcısı. Bkz. [Yapılandırma](../guide/configuration.md).

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

Bir sözlük tanımlar ve kaydeder. `DictionaryDefinition<N, T>` döndürür: `{ name, dictionary }`.

### Biçimlendirme yardımcıları

`plural`, `number`, `date`, `relativeTime`, `list` ve `formatters(locale)`. Bkz. [Biçimlendirme ve Çoğullar](../guide/formatting.md).

### `formatMessage(locale, message, values?)`, `parseMessage(message)`

Bir [ICU mesajını](../guide/icu.md) biçimlendirir veya ayrıştırır. Çalışma zamanının geri kalanı olmadan, `getArguments` ve `isIcuStructured` ile birlikte `dialexjs/icu` üzerinden de kullanılabilir.

### `createT(getDictionary, locale?)`

Tip güvenli bir `t("dictionary.key.path", ...args)` oluşturur. Bkz. [Anahtar Yolları](../guide/key-paths.md).

### Tipler

| Tip                                                       | Açıklama                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DialexConfig`                                            | `defaultLocale`, `locales`, `include`, `configFile`, `fallbacks`, `prefixDefault`, `lazy`, `translate`              |
| `DEFAULT_CONFIG`                                          | Bir ayar ya da yapılandırma dosyasının tamamı eksik olduğunda kullanılan varsayılanlar                              |
| `DialexSource`, `DialexClientConfig`, `DictionaryLoaders` | Üretilen `dialex` dışa aktarımı ve parçaları: `dictionaries`, istemci için güvenli bir `config` ve tembel `loaders` |
| `Translate`, `TranslationPath`                            | `t` işlevinin tipleri ve geçerli yolları                                                                            |
| `Register`                                                | Üretilen bildirimlerle genişletilir (`locales`)                                                                     |
| `Locales`                                                 | Yapılandırılmış yerel ayarların birleşimi veya `string`                                                             |
| `DictionaryRegistry`                                      | Sözlük adlarınız ve içerik tiplerinizle genişletilir                                                                |
| `DictionaryKey`, `ResolveDictionaryType<K>`               | Anahtar ve içerik tipleme yardımcıları                                                                              |
| `Dictionary<T>`                                           | `Record<Locales, T>`                                                                                                |
| `DictionaryDefinition<N, T>`                              | `defineDictionary` dönüş tipi                                                                                       |
| `globalDictionaries`                                      | `defineDictionary` ile doldurulan işlem içi kayıt defteri                                                           |

## `dialexjs/server`

`createDialexServer(dialex)`, üretilen `dialex` dışa aktarımını bağlar ve `{ getDictionary, getT }` döndürür: `getDictionary(name, locale?)` bir yerel ayar için sözlük içeriğini, `getT(locale?)` ise bir `t` işlevini döndürür. Bkz. [Next.js](../frameworks/nextjs.md).

## `dialexjs/react`

`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`. Bkz. [React / Vite](../frameworks/react.md).

## `dialexjs/vue` ve `dialexjs/nuxt`

`createDialex`, `useDialex`, `useDictionary`, `useT`, `preloadDictionaries` ve Nuxt modülü. Bkz. [Vue / Nuxt](../frameworks/vue.md).

## Sunucu adaptörleri

`dialexjs/express` (`dialex`), `dialexjs/fastify` (`dialexPlugin`), `dialexjs/koa` (`dialex`), `dialexjs/hono` (`dialex`), `dialexjs/nestjs` (`DialexModule` ve ilgili parçalar), `dialexjs/elysia` (`dialex`), `dialexjs/sveltekit` (`dialexHandle`), `dialexjs/astro` (`dialex`). Ortak seçenekler [Yerel Ayar Algılama](../guide/locale-detection.md#options) sayfasındadır.

## `dialexjs/routing`

`localizePath`, `stripLocale`, `alternateLinks`, `alternateLanguages`, `sitemapEntries`. Bkz. [Yönlendirme Yardımcıları](../guide/routing.md).

## `dialexjs/next/middleware` ve `dialexjs/next/link`

`createDialexMiddleware(options)` ve `DialexLink`. Bkz. [Next.js](../frameworks/nextjs.md).

## `dialexjs/angular`

`provideDialex`, `injectDialex`, `injectDictionary`, `injectT`, `DIALEX`. Bkz. [Angular](../frameworks/angular.md).

## `dialexjs/web` ve `dialexjs/h3`

Herhangi bir `Request` için `createDialexHandler(options)` ve h3 1.x `dialex(options)` middleware'i. Bkz. [Fetch API](../frameworks/web.md) ve [h3 / Nitro](../frameworks/h3.md).

## `dialexjs/testing`

`createTestDialex`, `mockRequest` ve çerçeve sarmalayıcıları: `TestDialexProvider` (`dialexjs/testing/react`) ile `createTestDialex` (`dialexjs/testing/vue`). Bkz. [Test Etme](../guide/testing.md).

## `@dialexjs/cli/api`

`analyzeProject`, `readStaticConfig`, `scanReferences` ve [VS Code eklentisinin](../guide/vscode.md) üzerine kurulduğu sözlük düzenleme yardımcıları. Sözlükleri ve yapılandırmaları proje kodunu çalıştırmadan sözdizimi ağacından okurlar.

## `dialexjs/scanner`

Bir `dictionaries` seçeneği verilmediğinde adaptörlerin kullandığı çalışma zamanı sözlük taraması. Üretimde `dialex generate` ile derlenmiş kayıt defterini tercih edin.
