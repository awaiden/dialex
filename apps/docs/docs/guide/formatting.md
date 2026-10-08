# Formatting & Plurals

Dialex ships small, typed helpers built on `Intl`. They live in the `dialex` package and work anywhere dictionary functions run: server or client.

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

## Helpers

| Helper                                     | Built on                  | Notes                                                                    |
| ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `plural(locale, count, forms)`             | `Intl.PluralRules`        | `other` is required; `zero`, `one`, `two`, `few`, `many` are optional    |
| `number(locale, value, options?)`          | `Intl.NumberFormat`       | Currency, percent, units, compact notation                               |
| `date(locale, value, options?)`            | `Intl.DateTimeFormat`     | Accepts `Date`, timestamp, or ISO string                                 |
| `relativeTime(locale, value, unit, opts?)` | `Intl.RelativeTimeFormat` | `relativeTime("en", -1, "day", { numeric: "auto" })` → `"yesterday"`     |
| `list(locale, values, options?)`           | `Intl.ListFormat`         | `list("en", ["a", "b", "c"])` → `"a, b, and c"`                          |
| `formatters(locale)`                       | all of the above          | Returns the helpers pre-bound to a locale, without the `locale` argument |

`plural` follows the CLDR rules for the locale, so English uses `one`/`other`, French treats 0 and 1 as `one`, and Russian and Arabic use `few`/`many` (and `zero`/`two` for Arabic). If a locale's category has no matching form, `other` is used.

For messages written as plain strings with `{count, plural, ...}`, see [ICU Messages](./icu.md).

The helpers take the locale as an explicit argument because each locale's content is written inside its own block of the dictionary.
