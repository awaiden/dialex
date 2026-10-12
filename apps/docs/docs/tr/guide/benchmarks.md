# Karşılaştırmalı performans testleri

Bir i18n kütüphanesinin kullanıcılarının tarayıcılarında ve sunucularında çalışan kısımlarına ait sayılar: bir mesajın ne kadar hızlı biçimlendirildiği ve kütüphanenin pakete kaç bayt eklediği. Dialex, [i18next](https://www.i18next.com), [intl-messageformat](https://formatjs.github.io) (`react-intl`'in arkasındaki FormatJS çekirdeği), [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) ve [Intlayer](https://intlayer.org) ile karşılaştırılır.

::: tip Bunları hüküm olarak değil, rehber olarak oku
Bir mikro performans testi tek bir makinede tek bir şeyi ölçer. Uygulamanın maliyeti çoğunlukla başka yerdedir: oluşturma, ağ, veri. Bu sayıları kütüphaneleri birbiriyle karşılaştırmak için kullan ve güvenmeden önce testi kendi donanımında çalıştır.
:::

## Ne ölçülüyor

Her kütüphane tarafından aynı değerlerle İngilizce biçimlendirilen dört mesaj. Herhangi bir şey ölçülmeden önce çalıştırıcı, tüm kütüphanelerin aynı metni döndürdüğünü denetler.

| Durum         | Mesaj                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Arama         | `Hello, world`                                                               |
| Enterpolasyon | `Hello, {name}!`                                                             |
| Çoğul         | `{count, plural, =0 {No items} one {# item} other {# items}}`                |
| İç içe        | `gender` üzerinde, içinde `count` üzerinde bir `plural` bulunan bir `select` |

Her kütüphane, belgelerinin önerdiği biçimde kullanılır:

- **dialexjs**: ICU dizeleri üzerinde `t("dictionary.key", values)`. `function messages` TypeScript fonksiyonlarıdır, `formatMessage` ise tek başına biçimlendiricidir.
- **i18next**: kendi enterpolasyonu ve çoğul anahtarları (`items_one`, `items_other`). Satır içi `select` yoktur, bu yüzden iç içe durum çalıştırılmaz.
- **intl-messageformat**: mesaj başına bir kez oluşturulup yeniden kullanılan biçimlendirici. `no cache` her çağrıda yeniden oluşturur; bir uygulama örneği saklamadığında olan budur.
- **@lingui/core**: `lingui compile`'ın yaptığı gibi önceden derlenmiş mesajlar.
- **Paraglide JS**: `paraglide-js compile` ile fonksiyonlara derlenen mesajlar (`m.plural({ count })`), varsayılan inlang mesaj biçiminde.
- **Intlayer**: bir `.content.ts` dosyasında bildirilen ve `intlayer build` ile oluşturulan içerik. Sözlük, bir bileşenin `useIntlayer` ile yaptığı gibi bir kez okunur. `getIntlayer per call` her çağrıda okur.

## Verim

Saniyedeki işlem sayısı, yüksek olan daha iyi. 300 ms ısınmadan sonra 400 ms'lik 7 turun medyanı.

Dialex yeşil renktedir. Çubuklar bir grafik içinde ölçeklidir; uzunlukları grafikler arasında değil, bir grafiğin içinde karşılaştır.

<BenchmarkChart metric="plural" title="Çoğul" subtitle="saniyedeki işlem, yüksek olan daha iyi" unsupported="desteklenmiyor" />

<BenchmarkChart metric="nested" title="İç içe select ve çoğul" subtitle="saniyedeki işlem, yüksek olan daha iyi" unsupported="desteklenmiyor" />

<BenchmarkChart metric="interpolation" title="Enterpolasyon" subtitle="saniyedeki işlem, yüksek olan daha iyi" unsupported="desteklenmiyor" />

<BenchmarkChart metric="lookup" title="Arama" subtitle="saniyedeki işlem, yüksek olan daha iyi" unsupported="desteklenmiyor" />

| Kütüphane                       |      Arama | Enterpolasyon |      Çoğul | İç içe select ve çoğul |
| ------------------------------- | ---------: | ------------: | ---------: | ---------------------: |
| dialexjs                        | 46,707,541 |    14,051,921 |  1,406,051 |              1,376,668 |
| dialexjs (function messages)    | 31,048,917 |    22,331,081 | 28,292,094 |             16,844,399 |
| dialexjs formatMessage          | 43,237,670 |    18,950,435 |  1,493,870 |              1,453,541 |
| i18next                         |    433,997 |       340,709 |    211,321 |                    n/a |
| intl-messageformat              | 21,672,973 |     4,179,803 |    441,800 |                406,716 |
| intl-messageformat (no cache)   |    215,188 |       172,955 |     23,179 |                 19,389 |
| @lingui/core                    |  7,855,446 |     5,666,858 |    276,988 |                132,382 |
| Paraglide JS                    | 23,386,911 |    16,831,905 |     89,624 |                 95,300 |
| Intlayer                        | 68,713,663 |     2,262,200 |  1,419,100 |              1,278,051 |
| Intlayer (getIntlayer per call) |    422,557 |       331,815 |    298,988 |                292,948 |

Node v24.21.0 ile, Intel Core i5-11400H üzerinde, Linux x64, 2026-10-12 tarihinde ölçüldü.

## Paket boyutu

Her kütüphanedeki en küçük yararlı program: oluştur, bir çoğul mesaj yükle ve biçimlendir. Tarayıcı için esbuild ile paketlenip küçültüldü.

<BenchmarkChart metric="size" title="Paket boyutu" subtitle="gzip bayt, düşük olan daha iyi" />

| Program                      | Küçültülmüş |     Gzip |   Brotli |
| ---------------------------- | ----------: | -------: | -------: |
| dialexjs (t)                 |     7,227 B |  2,739 B |  2,486 B |
| dialexjs/icu (formatMessage) |     6,479 B |  2,401 B |  2,175 B |
| dialexjs (function messages) |     7,268 B |  2,757 B |  2,491 B |
| i18next                      |    43,666 B | 14,043 B | 12,726 B |
| intl-messageformat           |    33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 |    10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |     4,824 B |  2,087 B |  1,869 B |
| Intlayer                     |    17,207 B |  4,901 B |  4,381 B |

Sürümler: dialexjs 0.7.2 ve çalışma zamanı performans değişiklikleri (derlenmiş mesaj biçimlendirme ve paylaşılan `Intl` biçimlendiricileri), i18next 26.4.3, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## Bu sayılar nasıl okunur

- **Kütüphanelerin ayrıştığı yer çoğullar ve sayılardır.** Bir çoğul, bir `PluralRules` ve bir sayı biçimlendirici gerektirir. Bunları her çağrıda oluşturmak yavaştır; bu yüzden Dialex yerel ayar ve seçenek başına birini tutar. Bu olmadan çoğul durumu saniyede yaklaşık 36.000 işlem ölçtü; bununla yaklaşık 1.400.000.
- **Fonksiyon mesajları ayrıştırıcıyı atlar.** TypeScript fonksiyonu olarak yazılan mesajı TypeScript derler; bu yüzden çoğul ve select, şablon dizesiyle aynı maliyettedir.
- **`t()` biçimlendiriciden biraz fazlasını yapar.** `dialexjs`, biçimlendirmeden önce noktalı yolu böler ve anahtarı arar; bu yüzden tek başına `formatMessage` enterpolasyonda daha hızlıdır; aramada ikisi ölçüm gürültüsü içindedir.
- **i18next çağrı başına daha fazlasını yapar.** Her `t()` için yedek zincirlerini, ad alanlarını ve eklentileri çözer; ödediğin özellik kümesi budur. ICU eklentisi sayılarını değiştirir; bu test onsuz çalışır.
- **Paraglide JS diğer kütüphaneler arasında enterpolasyonda en hızlıdır.** Değer içeren bir mesaj şablon dizesine derlenir. Çoğul kodu her çağrıda yeni bir `Intl.PluralRules` oluşturur (sürüm 2.27.0); Dialex'in ortadan kaldırdığı maliyet budur, bu yüzden çoğul enterpolasyonundan çok daha yavaştır (saniyede yaklaşık 89.000'e karşı 17 milyon işlem).
- **Intlayer'ın arama işlemi bir özellik okumasıdır.** Düz bir dizenin işlem yapması gerekmez; o sütunun çok önde olmasının nedeni budur. Enterpolasyon, çoğul ve select düğüm fonksiyonlarından geçer ve sözlüğü her çağrıda okumak, bir kez okumaktan çok daha yavaştır.
- **Boyut yalnızca çalışma zamanı içindir.** Lingui'nin rakamı önceden derlenmiş mesajlar içindir ve `lingui` araç zincirini içermez. Dialex ayrıştırıcısını çalışma zamanında taşır; bu yüzden ICU dizeleri derleme adımı olmadan çalışır.
- **Paraglide JS ve Intlayer kendi derleme araçlarıyla ölçülür.** Paraglide'ın rakamı bir derlenmiş mesaj ve çalışma zamanıdır. Intlayer'ın tarayıcıda çalışması için paketleyici eklentisine ihtiyacı vardır; bu yüzden `vite-intlayer` ve `vanilla-intlayer` ile derlenir.

## Kendin çalıştır

Test `apps/benchmarks` içinde bulunur. Paketleri bir kez derle, sonra çalıştır:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Sonuçlar, ölçüldükleri Node sürümü ve işlemciyle birlikte JSON olarak `apps/benchmarks/results/` içine yazılır.
