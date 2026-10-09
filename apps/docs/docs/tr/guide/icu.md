# ICU Mesajları

Bir sözlükteki metinler [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) mesajları olabilir. `t` işlevine bir değerler nesnesi verin; Dialex mesajı etkin yerel ayar için biçimlendirir.

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("cart", {
  en: {
    items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    owner: "Hello, {name}!",
  },
  ru: {
    items: "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}",
    owner: "Здравствуйте, {name}!",
  },
});
```

```ts
t("cart.items", { count: 5 }); // en: "5 items"   ru: "5 товаров"
t("cart.owner", { name: "Ada" }); // "Hello, Ada!"
t("cart.owner"); // type error: this message needs { name }
```

ICU mesajları düz metinlerle ve [fonksiyon değerleriyle](./dictionaries.md#values) yan yana çalışır; mevcut sözlükler için hiçbir şey değişmez. Mesajlar bir kez ayrıştırılır ve önbelleğe alınır.

## Sözdizimi

| Sözdizimi      | Örnek                                                                                        | Notlar                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Argüman        | `{name}`                                                                                     | Herhangi bir değer; `String()` ile dönüştürülür                                                                                  |
| Sayı           | `{n, number}`, `{n, number, integer}`, `{n, number, percent}`, `{n, number, ::currency/USD}` | `Intl.NumberFormat`                                                                                                              |
| Tarih, saat    | `{d, date, long}`, `{d, time, short}`                                                        | `short`, `medium` (varsayılan), `long`, `full` stilleri; değer bir `Date`, zaman damgası ya da tarih dizesidir                   |
| Çoğul          | `{n, plural, =0 {none} one {# item} other {# items}}`                                        | `=N` tam eşleşmeleri, ardından yerel ayarın CLDR kategorileri (`zero`, `one`, `two`, `few`, `many`, `other`). `other` zorunludur |
| Çoğul kaydırma | `{n, plural, offset:1 =0 {nobody} one {you and # other} other {you and # others}}`           | `#` ve kategoriler `n - offset` değerini kullanır; `=N` özgün `n` ile eşleşir                                                    |
| Sıra sayısı    | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`                              | Sıra sayısı çoğul kuralları                                                                                                      |
| Seçim          | `{gender, select, female {She} male {He} other {They}}`                                      | Değeri bir metin olarak eşleştirir. `other` zorunludur                                                                           |
| `#`            | çoğul dalının içinde                                                                         | Biçimlendirilmiş sayı. Bir çoğulun içindeki `select` yine çevreleyen çoğula başvurur                                             |
| Tırnaklama     | `'{'`, `'}'`, `''`                                                                           | `''` bir kesme işaretidir. Süslü parantezden önce gelmeyen tek bir `'` düz metindir                                              |

Dallar yukarıdakilerin herhangi birini içerebilir; bu yüzden çoğullar ve seçimler iç içe geçebilir.

### Desteklenmeyenler

- `<b>…</b>` gibi zengin metin etiketleri yorumlanmaz; düz metindir.
- `::percent` ve `::currency/XXX` dışındaki sayı iskeletleri ile tarih iskeletleri desteklenmez. Bilinmeyen sayı veya tarih stilleri varsayılan stile döner.

## Hatalar

Bir mesaj biçimlendirilemezse, örneğin bir değer eksikse, `t` bir uyarı kaydeder ve mesajı değiştirmeden döndürür; böylece hatalı bir metin bir sayfayı asla çökertmez. `formatMessage` ise `IcuFormatError` (eksik ya da geçersiz değerler) veya `IcuSyntaxError` (konumuyla birlikte) fırlatır.

```ts
import { formatMessage } from "dialexjs";

formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: 3 });
```

<a id="types"></a>

## Tipler

`dx generate` sonrasında her mesajın argümanları tip denetiminden geçer: `t("cart.items", { count: 5 })` sayısal bir `count` ister. `plural`, `selectordinal` ve `number` argümanları `number`, `date` ve `time` argümanları `Date | number` olur; `select`, seçeneklerinin birleşimidir (başka değerlere de izin verilir) ve sade bir `{name}` string, number, boolean veya `Date` kabul eder. Tipler varsayılan yerel ayardan gelir; diğer yerel ayarların aynı argümanları kullandığını [`dialex check`](../cli/check.md) doğrular. Argümansız metinler değer almaz, fonksiyon anahtarları kendi parametre tiplerini korur.

## Araçlar

- [`dialex check`](../cli/check.md) geçersiz ICU'yu, varsayılan yerel ayardan farklı argümanlar kullanan yerel ayarları ve bir dil için eksik çoğul seçeneklerini raporlar (örneğin Rusça için `few` ve `many` gerekir).
- [`dialex translate`](../cli/translate.md) yapıyı bozmadan korur: argümanlar, tipler, `select` anahtarları ve tam `=N` eşleşmeleri korunmalı, çoğul kategorileri ise değişebilir. Bunu yapamayan sağlayıcılar (DeepL) ICU mesajlarını hiç almaz.
- [`dialex import`](../cli/import.md) geçersiz ICU olan ya da başka bir yerel ayardaki aynı anahtarın argümanlarını değiştiren değerleri reddeder.
- [`dialex export`](../cli/export.md) ICU mesajlarını düz metin olarak yazar. Çevirmenlerden `{ }` yapısının tamamını korumalarını ve yalnızca dallardaki metni çevirmelerini isteyin.
