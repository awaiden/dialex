# API Başvurusu

Dialex'in dışa aktardığı her şey, giriş noktasına göre. Her giriş noktası `dialexjs` paketinin bir alt yoludur (`import { DialexProvider } from "dialexjs/react"`); CLI'nin programatik API'si `@dialexjs/cli/api`'dir. Paket kökünden yalnızca [Core](./core.md) sayfasında listelenenler dışa aktarılır, bu yüzden bir framework adaptörü ancak içe aktardığınızda yüklenir.

## Giriş noktaları

| Giriş noktası                                                                            | Ne sağlar                                                                         | Başvuru                                                                   |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `dialexjs`                                                                               | Yapılandırma, sözlükler, `createT`, biçimlendirme yardımcıları, ICU, tipler       | [Core](./core.md), [Biçimlendirme](./formatting.md), [Tipler](./types.md) |
| `dialexjs/icu`                                                                           | Çalışma zamanının geri kalanı olmadan ICU mesaj ayrıştırıcısı ve biçimlendiricisi | [ICU mesajları](./icu.md)                                                 |
| `dialexjs/server`                                                                        | Sunucu kodu için `getDictionary` ve `getT`                                        | [Sunucu adaptörleri](./server-adapters.md#dialexjs-server)                |
| `dialexjs/express`, `fastify`, `koa`, `hono`, `elysia`, `h3`, `hapi`, `adonis`, `nestjs` | İstek middleware'leri, eklentiler ve modüller                                     | [Sunucu adaptörleri](./server-adapters.md)                                |
| `dialexjs/sveltekit`, `astro`, `trpc`, `web`                                             | Hook, middleware, bağlam ve Fetch API işleyicisi                                  | [Sunucu adaptörleri](./server-adapters.md)                                |
| `dialexjs/react`, `preact`, `solid`, `vue`, `nuxt`, `svelte`, `qwik`, `lit`, `angular`   | İstemci framework'lerinin provider, hook ve store'ları                            | [İstemci framework'leri](./client-frameworks.md)                          |
| `dialexjs/react-native`                                                                  | Cihaz dilleri ve depolama ile `DialexProvider`                                    | [İstemci framework'leri](./client-frameworks.md#dialexjs-react-native)    |
| `dialexjs/next/middleware`, `dialexjs/next/link`                                         | Next.js middleware'i ve `DialexLink`                                              | [İstemci framework'leri](./client-frameworks.md#next-js)                  |
| `dialexjs/routing`                                                                       | Yerel ayar önekli yollar, `hreflang` bağlantıları ve sitemap girdileri            | [Yönlendirme](./routing.md)                                               |
| `dialexjs/testing`, `dialexjs/testing/react`, `dialexjs/testing/vue`                     | Test bağlamları, sahte istekler ve test provider'ları                             | [Test](./testing.md)                                                      |
| `@dialexjs/cli/api`                                                                      | Proje analizi ve sözlük düzenleme yardımcıları                                    | [CLI API](./cli-api.md)                                                   |

## Kurallar

- **Tipli adlar ve yollar.** `DictionaryRegistry`, `Register` ve `MessageArguments`, `dialex generate`'in `dialex-env.d.ts` içinde genişlettiği boş arayüzlerdir. O çalışana kadar sözlük adları ve `t()` yolları düz `string`'dir; sonrasında otomatik tamamlanır ve denetlenir. Bkz. [Tipler](./types.md).
- **Üretilen `dialex` nesnesi.** Provider'lar, adaptörler ve `createDialexServer`, `dialex.generated.ts` içindeki `{ ...dialex }` değerini kabul eder. Sözlükleri, istemci için güvenli yapılandırmayı ve tembel yüklemede loader'ları taşır; böylece yerel ayar ayarları yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- **Hatalar.** Eksik bir sözlük, yerel ayar ya da yol üretim kodunda asla istisna fırlatmaz: `[dialex]` önekiyle `console.warn` yazar ve boş bir nesne ya da yolun kendisini döndürür. Geçersiz ICU mesajlarını `t()` bildirir ve değiştirmeden döndürür; `formatMessage` istisna fırlatır. Bir provider'a ihtiyaç duyan hook'lar, provider yoksa istisna fırlatır.
- **Kararlılık.** Dialex 1.0'ın altındadır. Uyumsuz değişiklikler minor sürümlerle gelir ve [değişiklik günlüğünde](../guide/changelog.md) listelenir.
