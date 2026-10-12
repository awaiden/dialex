# Karşılaştırma

Dialex'in en sık karşılaştırıldığı kütüphanelerden nasıl ayrıldığı: [i18next](https://www.i18next.com), [FormatJS](https://formatjs.github.io) (`react-intl` ve `intl-messageformat`) [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) ve [Intlayer](https://intlayer.org). Hepsi iyi kütüphanelerdir; doğru olan, ekibinin metni nasıl yazdığına ve çevirdiğine bağlıdır.

Hız ve boyut sayıları için [Karşılaştırmalı performans testleri](./benchmarks.md) sayfasına bak.

## Bir bakışta

| Soru                  | Dialex                                           | i18next                                   | FormatJS                          | Lingui                                                           |
| --------------------- | ------------------------------------------------ | ----------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Metin nerede durur    | Kodun yanında TypeScript sözlükleri              | JSON kaynakları, ad alanına göre yüklenir | Kodda mesajlar, ayrıca kataloglar | Kodda mesajlar, kataloglara çıkarılır                            |
| Mesaj sözdizimi       | ICU MessageFormat veya bir TypeScript fonksiyonu | Kendi `{{value}}` ve çoğul anahtarları    | ICU MessageFormat                 | ICU MessageFormat                                                |
| Tipli anahtarlar      | Sözlüklerinden üretilir                          | Kaynak tür bildirimleri üzerinden         | Mesaj kimlikleri dizelerdir       | Anahtar yok: kaynak metin kimliktir                              |
| Tipli ICU argümanları | Her mesajdan üretilir                            | Anahtar türlerinin parçası değil          | Varsayılan olarak değil           | Değerler şablondan gelir, bu yüzden TypeScript denetler          |
| Eksik çeviriler       | `dialex check` derlemeyi başarısız kılar         | Çalışma zamanında bildirilir, yedeklerle  | `onError` ile bildirilir          | `lingui extract` sayar; `lingui compile --strict` başarısız olur |
| Çıkarma adımı         | Yok: kaynak sözlüklerdir                         | İsteğe bağlı araçlar                      | `formatjs extract`                | `lingui extract`                                                 |
| Çevirmene devir       | JSON, CSV ve XLIFF dışa ve içe aktarma           | JSON, birçok hizmet entegre olur          | JSON, birkaç sağlayıcı biçiminde  | PO ve JSON katalogları                                           |
| Tembel yükleme        | Sözlük veya yerel ayar başına, üretilir          | Arka uçlar ve ad alanları                 | Kendi dinamik içe aktarmaların    | Kendi dinamik içe aktarmaların                                   |

Hücreler her kütüphanenin belgelenmiş varsayılanlarını anlatır. Hepsi eklentilerle veya kendi kodunla genişletilebilir.

## Dialex ve i18next

i18next, JavaScript için en yaygın kullanılan i18n kütüphanesidir; arka uçlar, dil algılayıcılar ve çerçeve bağlayıcılarından oluşan büyük bir ekosistemi vardır. Çevirileri JSON kaynakları olarak tutar ve ad alanları, yedekler ve eklentiler gibi çalışma zamanı özellikleri sunar.

Dialex farklı bir denge kurar. Sözlükler TypeScript'tir ve tek bir tipli kayıt defterine derlenir; yanlış bir anahtar ya da argüman tür hatasıdır ve eksik bir yerel ayar yayından önce `dialex check`'i başarısız kılar. Yapılandırılacak bir çalışma zamanı kaynak yükleme yoktur; [tembel yükleme](./lazy-loading.md) ile bir sözlük, kod bölünmüş bir modüldür.

Eklenti ekosistemine, çevirileri çalışma zamanında getiren arka uçlara ya da TypeScript'e bağlı olmayan bir çalışma zamanına ihtiyacın olduğunda i18next'i seç. Derleyicinin metnini korumasını istediğinde Dialex'i seç.

## Dialex ve FormatJS

FormatJS, JavaScript için ICU MessageFormat'ın başvuru uygulamasıdır ve `react-intl` React bileşenlerini onun üzerine kurar. Mesajlar kodda `defineMessages` veya `formatMessage` ile tanımlanır, `formatjs` CLI ile çıkarılır ve önceden derlenebilir.

Dialex aynı mesaj sözdizimini kullanır; bu yüzden ICU mesajları olduğu gibi taşınır. Fark, çevresindeki iş akışındadır: Dialex'in çıkarma adımına ihtiyacı yoktur, çünkü kaynak sözlüktür ve anahtarlar ile argümanlar için tür üretir. Çalışma zamanı da daha küçüktür; bu [Karşılaştırmalı performans testleri](./benchmarks.md) sayfasında gösterilmiştir.

Standart uygulamayı ve React bileşenlerini istediğinde ya da çeviri sürecin `formatjs extract` etrafında kurulduğunda FormatJS'i seç.

## Dialex ve Lingui

Lingui mesajı kaynakta tutar (`t` ve `Trans` makroları), katalogları PO veya JSON olarak çıkarır ve küçük bir çalışma zamanına derler. Sonuç çok küçük bir paket ve İngilizce metnin bileşende yazıldığı bir yazım stilidir.

Dialex ise metni sözlüklerde tutar; böylece bir anahtar amacını adlandırır ve her yerel ayar dosyada diğerlerinin yanında durur. Her iki yaklaşım da ICU MessageFormat kullanır.

Mesajları satır içinde yazmayı tercih ediyorsan ve PO tabanlı bir çeviri sürecin varsa Lingui'yi seç. Adlandırılmış anahtarları tercih ediyorsan ve tür sisteminin bunları denetlemesini istiyorsan Dialex'i seç.

## Paraglide JS ve Intlayer bir bakışta

Derleme zamanında da çalışan iki kütüphane, Dialex'in yanında:

| Soru                  | Dialex                                           | Paraglide JS                                                             | Intlayer                                                     |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Metin nerede durur    | Kodun yanında TypeScript sözlükleri              | Yerel ayar başına JSON mesaj dosyaları                                   | Bileşenlerin yanında `.content` dosyaları                    |
| Mesaj sözdizimi       | ICU MessageFormat veya bir TypeScript fonksiyonu | Inlang biçimi; eklentiyle ICU MessageFormat 1 ve i18next                 | Kendi düğümleri (`t`, `plural`, `enu`, `select`) veya ICU    |
| Tipli anahtarlar      | Sözlüklerinden üretilir                          | Her mesaj üretilmiş bir fonksiyondur                                     | Her bildirimde bir `Dictionary` türü ile                     |
| Tipli ICU argümanları | Her mesajdan üretilir                            | Üretilen fonksiyonların parametreleri tiplidir                           | Belgelerinde ele alınmıyor                                   |
| Eksik çeviriler       | `dialex check` derlemeyi başarısız kılar         | inlang CLI çevirileri CI'da denetler                                     | `intlayer content test` bunları denetler                     |
| Çıkarma adımı         | Yok: kaynak sözlüklerdir                         | Yok: mesajlar JSON dosyalarına yazılır                                   | `intlayer extract` dizeleri bileşenlerden taşır              |
| Çevirmene devir       | JSON, CSV ve XLIFF dışa ve içe aktarma           | Geliştirici olmayanlar için Fink editörü; eklentiyle içe ve dışa aktarma | CMS ve editör, yapay zekâyla `fill`, JSON ve YAML dosyaları  |
| Tembel yükleme        | Sözlük veya yerel ayar başına, üretilir          | Kullanılmayan mesajları paketleyici atar                                 | Sözlük başına `importMode`: `static`, `dynamic` veya `fetch` |

## Dialex ve Paraglide JS

[Paraglide JS](https://paraglidejs.com), inlang projesinden bir derleyicidir. Mesajlar JSON dosyalarında durur ve derleyici her birini tipli parametreleri olan bir fonksiyona (`m.greeting({ name })`) çevirir; böylece paketleyici kullanmadığın mesajları atabilir. Mesaj biçimi takılabilirdir: varsayılan inlang biçimidir ve eklentiler ICU MessageFormat 1 ile i18next dosyalarını ekler.

Dialex de mesajlarından tür üretir, ama bir özelliğin metnini tek bir sözlükte, tüm yerel ayarlar yan yana olacak şekilde tutar ve ICU dizelerini küçük bir çalışma zamanında çalıştırır. Paraglide'ın mesaj başına fonksiyonları en ince tree-shaking'i verir; Dialex'in [tembel yüklemesi](./lazy-loading.md) sözlüğe veya yerel ayara göre böler.

Mesaj başına tree-shaking senin için en önemliyse ya da inlang'ın editör araçlarını istiyorsan Paraglide JS'i seç. Sözlükleri özelliğe göre gruplamayı, ICU dizelerini ve fonksiyon mesajlarını aynı dosyada tutmayı ve yerel ayarlar arasında eşlik denetimi istiyorsan Dialex'i seç.

## Dialex ve Intlayer

[Intlayer](https://intlayer.org) içeriği her bileşenin yanındaki `.content` dosyalarında (TypeScript, JSON, YAML veya Markdown) bildirir, her birinin bir `key`'i vardır, ve bunları sözlüklere derler. Çevresinde bir CMS ve editör, çevirileri yapay zekâyla tamamlayan `fill`, dizeleri bileşenlerden taşıyan `extract` ve eksik çevirileri bulan `content test` sunar.

Dialex de metni kodun yanındaki `*.content.ts` dosyalarında tutar, ama bir kütüphane ve komut satırı aracı olarak kalır: mesajlar düz ICU dizeleri veya fonksiyonlardır ve konuştuğu tek hizmet `dialex translate` için seçtiğindir.

Geliştirici olmayanlar için bir editör, kendi düğüm türleri olan bileşen başına içerik ve iş akışına yerleşik yapay zekâ doldurma istiyorsan Intlayer'ı seç. Standart ICU MessageFormat istiyorsan ve barındırılan bir hizmet istemiyorsan Dialex'i seç.

## Dialex ne zaman doğru seçim değildir

- Çevirileri dağıtım yapmadan, çalışma zamanında bir hizmetten yüklemen ya da değiştirmen gerekiyor.
- Çevirmenlerin yalnızca PO dosyası okuyan bir araçta çalışıyor ve dönüştürme adımı istemiyorsun. Dialex JSON, CSV ve XLIFF dışa aktarır.
- Projen düz JavaScript. Dialex'in asıl değeri ürettiği türlerdir.
- Yalnızca i18next, FormatJS veya Lingui'nin sunduğu bir ekosistem eklentisine bağımlısın.

## Dialex'e geçiş

- ICU mesajlarını olduğu gibi koru; sözdizimi aynıdır.
- Her ad alanını veya kataloğu bir `defineDictionary` dosyasına çevir ve `dialex check`'in yerel ayarlar arasında farklı olan anahtarları bulmasına izin ver.
- Mevcut çevirileri JSON, CSV veya XLIFF'ten [`dialex import`](../cli/import.md) ile içe aktar.
