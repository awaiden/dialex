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
- **dialexjs dictionary object**: çözümlenmiş sözlüğü döndüren `getDictionary("home").title`. Yalnızca arama durumu geçerlidir, çünkü değer içeren bir mesaj `t()` üzerinden geçer. `dictionary object` bir kez alınmış sözlükten okur; `getDictionary per call` sözlüğü her çağrıda çözer.
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

| Kütüphane                         |      Arama | Enterpolasyon |      Çoğul | İç içe select ve çoğul |
| --------------------------------- | ---------: | ------------: | ---------: | ---------------------: |
| dialexjs                          | 45,921,949 |    17,591,571 |  9,956,907 |              8,572,741 |
| dialexjs (function messages)      | 30,294,716 |    21,592,553 | 26,256,191 |             17,178,301 |
| dialexjs formatMessage            | 41,122,519 |    24,645,778 | 14,808,836 |             11,676,472 |
| dialexjs (dictionary object)      | 80,403,999 |           n/a |        n/a |                    n/a |
| dialexjs (getDictionary per call) | 77,900,218 |           n/a |        n/a |                    n/a |
| i18next                           |    391,482 |       315,556 |    200,486 |                    n/a |
| intl-messageformat                | 21,248,346 |     4,068,286 |    431,805 |                394,363 |
| intl-messageformat (no cache)     |    220,735 |       165,743 |     22,636 |                 18,146 |
| @lingui/core                      |  7,628,934 |     5,609,820 |    271,897 |                129,683 |
| Paraglide JS                      | 21,122,876 |    16,040,431 |     86,959 |                 91,792 |
| Intlayer                          | 64,030,320 |     2,126,902 |  1,351,726 |              1,228,197 |
| Intlayer (getIntlayer per call)   |    351,302 |       281,777 |    262,436 |                252,884 |

Node v24.21.0 ile, Intel Core i5-11400H üzerinde, Linux x64, 2026-10-13 tarihinde ölçüldü.

## Paket boyutu

Her kütüphanedeki en küçük yararlı program: oluştur, bir çoğul mesaj yükle ve biçimlendir. Tarayıcı için esbuild ile paketlenip küçültüldü.

<BenchmarkChart metric="size" title="Paket boyutu" subtitle="gzip bayt, düşük olan daha iyi" />

| Program                      | Küçültülmüş |     Gzip |   Brotli |
| ---------------------------- | ----------: | -------: | -------: |
| dialexjs (t)                 |     8,025 B |  3,029 B |  2,760 B |
| dialexjs/icu (formatMessage) |     7,060 B |  2,619 B |  2,397 B |
| dialexjs (function messages) |     8,066 B |  3,052 B |  2,772 B |
| i18next                      |    43,721 B | 14,080 B | 12,762 B |
| intl-messageformat           |    33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 |    10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |     4,824 B |  2,087 B |  1,869 B |
| Intlayer                     |    17,207 B |  4,901 B |  4,381 B |

Sürümler: dialexjs 0.9.1, i18next 26.4.4, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## Bu sayılar nasıl okunur

- **Kütüphanelerin ayrıştığı yer çoğullar ve sayılardır.** Bir çoğul, bir `PluralRules` ve bir sayı biçimlendirici gerektirir. Bunları her çağrıda oluşturmak yavaştır; bu yüzden Dialex yerel ayar ve seçenek başına birini tutar. Bu olmadan çoğul durumu saniyede yaklaşık 36.000 işlem ölçtü; bununla yaklaşık 700.000; küçük sayıların kategorisi ve biçimlendirilmiş sayısı yerel ayar başına hatırlanınca yaklaşık 9.900.000.
- **Fonksiyon mesajları ayrıştırıcıyı atlar.** TypeScript fonksiyonu olarak yazılan mesajı TypeScript derler; bu yüzden çoğul ve select, şablon dizesiyle aynı maliyettedir.
- **`t()` biçimlendiriciden biraz fazlasını yapar.** `dialexjs`, biçimlendirmeden önce noktalı yolu böler ve anahtarı arar; bu yüzden değerler biçimlendirilirken tek başına `formatMessage` daha hızlıdır. Değersiz düz bir dize olduğu gibi döndürülür; bu yüzden aramada `t()` daha hızlıdır.
- **i18next çağrı başına daha fazlasını yapar.** Her `t()` için yedek zincirlerini, ad alanlarını ve eklentileri çözer; ödediğin özellik kümesi budur. ICU eklentisi sayılarını değiştirir; bu test onsuz çalışır.
- **Paraglide JS diğer kütüphaneler arasında enterpolasyonda en hızlıdır.** Değer içeren bir mesaj şablon dizesine derlenir. Çoğul kodu her çağrıda yeni bir `Intl.PluralRules` oluşturur (sürüm 2.27.0); Dialex'in ortadan kaldırdığı maliyet budur, bu yüzden çoğul enterpolasyonundan çok daha yavaştır (saniyede yaklaşık 87.000'e karşı 16 milyon işlem).
- **Intlayer'ın arama işlemi bir özellik okumasıdır.** Düz bir dizenin işlem yapması gerekmez; bir yolu arayan ya da biçimlendiren kütüphanelerin çok önünde olmasının nedeni budur. Enterpolasyon, çoğul ve select düğüm fonksiyonlarından geçer ve sözlüğü her çağrıda okumak, bir kez okumaktan çok daha yavaştır. Bir Dialex sözlük nesnesini okumak aynı işlemdir ve aynı büyüklük mertebesindedir; değerler söz konusu olduğunda `t()` ve Intlayer'ın düğüm fonksiyonları gerçek iş yapar, sütunların ayrıştığı yer burasıdır.
- **Boyut yalnızca çalışma zamanı içindir.** Lingui'nin rakamı önceden derlenmiş mesajlar içindir ve `lingui` araç zincirini içermez. Dialex ayrıştırıcısını çalışma zamanında taşır; bu yüzden ICU dizeleri derleme adımı olmadan çalışır. Biçimlendirmeyi hızlandıran closure'lar ve önbellekler, yerini aldıkları yorumlayıcıya göre yaklaşık 2 KB küçültülmüş boyut (0,7 KB gzip) ekler.
- **Paraglide JS ve Intlayer kendi derleme araçlarıyla ölçülür.** Paraglide'ın rakamı bir derlenmiş mesaj ve çalışma zamanıdır. Intlayer'ın tarayıcıda çalışması için paketleyici eklentisine ihtiyacı vardır; bu yüzden `vite-intlayer` ve `vanilla-intlayer` ile derlenir.

## Kendin çalıştır

Test `apps/benchmarks` içinde bulunur. Paketleri bir kez derle, sonra çalıştır:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Sonuçlar, ölçüldükleri Node sürümü ve işlemciyle birlikte JSON olarak `apps/benchmarks/results/` içine yazılır.
