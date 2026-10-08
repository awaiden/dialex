# Biçimlendirme ve Çoğullar

Dialex, `Intl` üzerine kurulu küçük ve tip güvenli yardımcılarla gelir. Bunlar `dialex` paketinde yer alır ve sözlük fonksiyonlarının çalıştığı her yerde, sunucuda ya da istemcide çalışır.

```ts
import { defineDictionary, plural, formatters } from "dialex";

const en = formatters("en");

export default defineDictionary("cart", {
  en: {
    items: (n: number) => plural("en", n, { one: "1 item", other: `${n} items` }),
    total: (amount: number) =>
      `Total: ${en.number(amount, { style: "currency", currency: "USD" })}`,
  },
  tr: {
    items: (n: number) => plural("tr", n, { other: `${n} ürün` }),
    total: (amount: number) =>
      `Toplam: ${formatters("tr").number(amount, { style: "currency", currency: "TRY" })}`,
  },
});
```

## Yardımcılar

| Yardımcı                                   | Dayandığı API             | Notlar                                                                                    |
| ------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------- |
| `plural(locale, count, forms)`             | `Intl.PluralRules`        | `other` zorunludur; `zero`, `one`, `two`, `few`, `many` isteğe bağlıdır                   |
| `number(locale, value, options?)`          | `Intl.NumberFormat`       | Para birimi, yüzde, birimler, kompakt gösterim                                            |
| `date(locale, value, options?)`            | `Intl.DateTimeFormat`     | `Date`, zaman damgası veya ISO dizesi kabul eder                                          |
| `relativeTime(locale, value, unit, opts?)` | `Intl.RelativeTimeFormat` | `relativeTime("en", -1, "day", { numeric: "auto" })` → `"yesterday"`                      |
| `list(locale, values, options?)`           | `Intl.ListFormat`         | `list("en", ["a", "b", "c"])` → `"a, b, and c"`                                           |
| `formatters(locale)`                       | yukarıdakilerin tümü      | Yardımcıları, `locale` argümanı olmadan bir yerel ayara önceden bağlanmış olarak döndürür |

`plural`, yerel ayarın CLDR kurallarını izler: İngilizce `one`/`other` kullanır, Fransızca 0 ve 1'i `one` sayar, Rusça ve Arapça `few`/`many` kullanır (Arapça ayrıca `zero`/`two`). Bir yerel ayarın kategorisi için eşleşen biçim yoksa `other` kullanılır.

`{count, plural, ...}` içeren düz metin mesajları için [ICU Mesajları](./icu.md) sayfasına bakın.

Yardımcılar yerel ayarı açık bir argüman olarak alır, çünkü her yerel ayarın içeriği sözlüğün kendi bloğunun içinde yazılır.
