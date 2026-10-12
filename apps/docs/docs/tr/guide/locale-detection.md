# Yerel Ayar Algılama

Sunucu adaptörleri (Express, Fastify, Koa, Hono, Elysia, h3, Hapi, AdonisJS, NestJS, SvelteKit, Astro, tRPC ve Fetch API işleyicisi) istek yerel ayarını birkaç kaynaktan şu sırayla çözer:

1. Özel bir çıkarıcı (`custom`)
2. İlk yol segmenti (`/tr/...`); `usePath` doğruysa ve `locales` yapılandırılmışsa (`locales` yoksa yol yok sayılır; böylece `/api` gibi segmentler asla yerel ayar sanılmaz; sorgu dizeleri ve parça tanımlayıcıları eşleştirmeden önce atılır)
3. Sorgu parametresi (`locale`, `lang`)
4. Çerez (`locale`, `lang`)
5. `Accept-Language` başlığı

Desteklenen bir yerel ayarla eşleşen ilk aday kazanır; yoksa `defaultLocale` kullanılır. `q=0` olan `Accept-Language` girdileri yok sayılır ve çerez değerindeki hatalı yüzde kodlaması hata vermek yerine olduğu gibi kullanılır.

<a id="options"></a>

## Seçenekler

Tüm adaptörler şunları kabul eder (`LocaleResolverOptions`):

| Seçenek         | Tip                                    | Varsayılan           | Açıklama                                                                                           |
| --------------- | -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Yedek yerel ayar                                                                                   |
| `locales`       | `string[]`                             | —                    | Desteklenen yerel ayarlar                                                                          |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Sorgu parametresi adları                                                                           |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Çerez adları                                                                                       |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Okunacak başlık                                                                                    |
| `usePath`       | `boolean`                              | `true`               | İlk URL yol segmentini kontrol et                                                                  |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Özel çıkarıcı                                                                                      |
| `config`        | `GeneratedConfig`                      | —                    | Üretilen yapılandırma. Ayarlanmamış `defaultLocale`, `locales` ve `fallbacks` değerlerini doldurur |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Açık [yedek zincirleri](./fallbacks.md)                                                            |

Bunlara ek olarak her adaptör `dictionaries` (bir harita ya da `defineDictionary` sonuçlarının dizisi; olmazsa `defineDictionary` ile kaydedilen sözlükler kullanılır) ve `setHeader` (varsayılan `true`; `Content-Language` gönderir) alır. Açıkça verdiğiniz seçenekler üretilen `config`'e, üretilen `config` de varsayılanlara baskındır. Her seçenek, adaptör adaptör, [Sunucu adaptörleri](../api/server-adapters.md) sayfasındadır.

## Eşleştirme kuralları

`matchLocale` büyük/küçük harfe duyarsızdır ve sırasıyla şunları dener: tam eşleşme, adayın dil öneki (`en-US` → `en`), ardından önek olarak eşleşen desteklenen yerel ayar (`en` → `en-US`).

## Yanıt başlığı

`setHeader` ile (varsayılan) çözümlenen yerel ayar `Content-Language` olarak gönderilir. Bir CDN ya da proxy `Accept-Language`'a bağlı sayfaları önbelleğe alıyorsa `Vary: Accept-Language` de gönderin.

## Yardımcılar

Adaptörler dahili olarak `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` ve `extractPathLocale` işlevlerini paylaşır. Bunlar `src/resolver.ts` içindedir ve paketin herkese açık `exports` alanının parçası değildir.
