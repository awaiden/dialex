# Formatierung und Plurale

Dialex liefert kleine, typisierte Helfer auf Basis von `Intl` mit. Sie gehören zum Paket `dialex` und funktionieren überall, wo Wörterbuchfunktionen laufen: auf dem Server oder im Client.

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

## Helfer

| Helfer                                     | Basiert auf               | Hinweise                                                                    |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------------------- |
| `plural(locale, count, forms)`             | `Intl.PluralRules`        | `other` ist erforderlich; `zero`, `one`, `two`, `few`, `many` sind optional |
| `number(locale, value, options?)`          | `Intl.NumberFormat`       | Währung, Prozent, Einheiten, kompakte Schreibweise                          |
| `date(locale, value, options?)`            | `Intl.DateTimeFormat`     | Akzeptiert `Date`, Zeitstempel oder ISO-String                              |
| `relativeTime(locale, value, unit, opts?)` | `Intl.RelativeTimeFormat` | `relativeTime("en", -1, "day", { numeric: "auto" })` → `"yesterday"`        |
| `list(locale, values, options?)`           | `Intl.ListFormat`         | `list("en", ["a", "b", "c"])` → `"a, b, and c"`                             |
| `formatters(locale)`                       | alle oben genannten       | Liefert die Helfer vorab an ein Locale gebunden, ohne das Argument `locale` |

`plural` folgt den CLDR-Regeln des Locales: Englisch nutzt `one`/`other`, Französisch behandelt 0 und 1 als `one`, Russisch und Arabisch verwenden `few`/`many` (Arabisch zusätzlich `zero`/`two`). Hat die Kategorie eines Locales keine passende Form, wird `other` verwendet.

Für Nachrichten, die als einfache Strings mit `{count, plural, ...}` geschrieben sind, siehe [ICU-Nachrichten](./icu.md).

Die Helfer erhalten das Locale als explizites Argument, weil der Inhalt jedes Locales in einem eigenen Block des Wörterbuchs steht.
