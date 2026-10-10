# Yerel Ayar Algılama

Sunucu adaptörleri (Express, Fastify, Koa, Hono, NestJS) istek yerel ayarını birkaç kaynaktan şu sırayla çözer:

1. Özel bir çıkarıcı (`custom`)
2. İlk yol segmenti (`/tr/...`); `usePath` doğruysa ve `locales` yapılandırılmışsa (`locales` yoksa yol yok sayılır; böylece `/api` gibi segmentler asla yerel ayar sanılmaz; sorgu dizeleri ve parça tanımlayıcıları eşleştirmeden önce atılır)
3. Sorgu parametresi (`locale`, `lang`)
4. Çerez (`locale`, `lang`)
5. `Accept-Language` başlığı

Desteklenen bir yerel ayarla eşleşen ilk aday kazanır; yoksa `defaultLocale` kullanılır. `q=0` olan `Accept-Language` girdileri yok sayılır ve çerez değerindeki hatalı yüzde kodlaması hata vermek yerine olduğu gibi kullanılır.

<a id="options"></a>

## Seçenekler

Tüm adaptörler şunları kabul eder (`LocaleResolverOptions`):

| Seçenek         | Tip                                    | Varsayılan           | Açıklama                          |
| --------------- | -------------------------------------- | -------------------- | --------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Yedek yerel ayar                  |
| `locales`       | `string[]`                             | —                    | Desteklenen yerel ayarlar         |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Sorgu parametresi adları          |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Çerez adları                      |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Okunacak başlık                   |
| `usePath`       | `boolean`                              | `true`               | İlk URL yol segmentini kontrol et |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Özel çıkarıcı                     |

Buna ek olarak adaptöre göre: `config` (üretilen yapılandırma; ayarlanmamışsa `defaultLocale`, `locales` ve `fallbacks` değerlerini doldurur, `{ ...dialex }` bunu sağlar), `dictionaries` (`defineDictionary` sonuçlarından oluşan harita veya dizi; verilmezse paketlenmiş kayıt defterine döner) ve `setHeader` (varsayılan `true`, `Content-Language` başlığını ayarlar).

## Eşleştirme kuralları

`matchLocale` büyük/küçük harfe duyarsızdır ve sırasıyla şunları dener: tam eşleşme, adayın dil öneki (`en-US` → `en`), ardından önek olarak eşleşen desteklenen yerel ayar (`en` → `en-US`).

## Yardımcılar

Adaptörler dahili olarak `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` ve `extractPathLocale` işlevlerini paylaşır. Bunlar `src/resolver.ts` içindedir ve paketin herkese açık `exports` alanının parçası değildir.
