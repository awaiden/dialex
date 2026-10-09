# ICU Messages

Strings in a dictionary can be [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) messages. Pass a values object to `t` and Dialex formats the message for the active locale.

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

ICU messages work next to plain strings and [function values](./dictionaries.md#values); nothing changes for existing dictionaries. Messages are parsed once and cached.

## Syntax

| Syntax        | Example                                                                                      | Notes                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Argument      | `{name}`                                                                                     | Any value; converted with `String()`                                                                                      |
| Number        | `{n, number}`, `{n, number, integer}`, `{n, number, percent}`, `{n, number, ::currency/USD}` | `Intl.NumberFormat`                                                                                                       |
| Date, time    | `{d, date, long}`, `{d, time, short}`                                                        | Styles `short`, `medium` (default), `long`, `full`; value is a `Date`, timestamp or date string                           |
| Plural        | `{n, plural, =0 {none} one {# item} other {# items}}`                                        | `=N` exact matches, then the locale's CLDR categories (`zero`, `one`, `two`, `few`, `many`, `other`). `other` is required |
| Plural offset | `{n, plural, offset:1 =0 {nobody} one {you and # other} other {you and # others}}`           | `#` and the categories use `n - offset`; `=N` matches the original `n`                                                    |
| Ordinal       | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`                              | Ordinal plural rules                                                                                                      |
| Select        | `{gender, select, female {She} male {He} other {They}}`                                      | Matches the value as a string. `other` is required                                                                        |
| `#`           | inside a plural branch                                                                       | The formatted number. A `select` nested in a plural still refers to the enclosing plural                                  |
| Quoting       | `'{'`, `'}'`, `''`                                                                           | `''` is an apostrophe. A single `'` that does not precede a brace is literal text                                         |

Branches can contain any of the above, so plurals and selects nest.

### Not supported

- Rich-text tags such as `<b>…</b>` are not interpreted; they are plain text.
- Number skeletons other than `::percent` and `::currency/XXX`, and date skeletons, are not supported. Unknown number or date styles fall back to the default style.

## Errors

If a message cannot be formatted, for example because a value is missing, `t` logs a warning and returns the message unchanged, so a bad string never crashes a page. `formatMessage` itself throws `IcuFormatError` (missing or invalid values) or `IcuSyntaxError` (with a position).

```ts
import { formatMessage } from "dialexjs";

formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: 3 });
```

## Types

After `dx generate`, the arguments of each message are type-checked: `t("cart.items", { count: 5 })` needs a numeric `count`. `plural`, `selectordinal` and `number` arguments are `number`, `date` and `time` are `Date | number`, `select` is the union of its options (other values are still allowed), and a plain `{name}` accepts a string, number, boolean or `Date`. The types come from the default locale, and [`dialex check`](../cli/check.md) makes sure the other locales use the same arguments. Strings without arguments take no values, and function keys keep their own parameter types.

## Tooling

- [`dialex check`](../cli/check.md) reports invalid ICU, locales that use different arguments than the default locale, and plural options missing for a language (Russian needs `few` and `many`, for example).
- [`dialex translate`](../cli/translate.md) keeps the structure intact: arguments, types, `select` keys and exact `=N` matches must survive, while plural categories may change. Providers that cannot do this (DeepL) never receive ICU messages.
- [`dialex import`](../cli/import.md) rejects values that are invalid ICU or that change the arguments of the same key in another locale.
- [`dialex export`](../cli/export.md) writes ICU messages as plain strings. Ask translators to keep everything inside `{ }` structure and translate only the text in branches.
