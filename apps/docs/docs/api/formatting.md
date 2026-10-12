# Formatting

Locale-aware helpers built on `Intl`, exported from `dialexjs`. Every `Intl` formatter is created once per locale and options and reused, so calling a helper in a render function or a request handler is cheap. For messages with arguments use [ICU messages](./icu.md); these helpers are for values you format yourself, typically inside a function message.

## `plural(locale, count, forms)`

```ts
function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T;
```

Picks the form for `count` with the locale's CLDR rules. `forms.other` is required and is used when the locale's category has no form of its own.

```ts
items: (n: number) => plural("en", n, { one: "1 item", other: `${n} items` });
```

## `number(locale, value, options?)`

```ts
function number(locale: string, value: number, options?: Intl.NumberFormatOptions): string;
```

```ts
number("de", 1234.5); // "1.234,5"
number("en", 0.25, { style: "percent" }); // "25%"
number("tr", 9.9, { style: "currency", currency: "TRY" }); // "₺9,90"
```

## `date(locale, value, options?)`

```ts
function date(
  locale: string,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string;
```

`value` may be a `Date`, a timestamp or anything `new Date(value)` accepts.

```ts
date("en", new Date(2026, 2, 1), { dateStyle: "medium" }); // "Mar 1, 2026"
```

## `relativeTime(locale, value, unit, options?)`

```ts
function relativeTime(
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
): string;
```

A negative `value` is in the past.

```ts
relativeTime("en", -2, "day"); // "2 days ago"
relativeTime("en", 1, "day", { numeric: "auto" }); // "tomorrow"
```

## `list(locale, values, options?)`

```ts
function list(locale: string, values: Iterable<string>, options?: Intl.ListFormatOptions): string;
```

```ts
list("en", ["a", "b", "c"]); // "a, b, and c"
list("de", ["a", "b", "c"]); // "a, b und c"
```

## `formatters(locale)`

```ts
function formatters(locale: string): Formatters;
```

The five helpers above with the locale already bound.

```ts
const f = formatters("tr");
f.number(1234.5); // "1.234,5"
```

## Types

| Type             | Definition                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `PluralCategory` | `"zero" \| "one" \| "two" \| "few" \| "many" \| "other"`                                    |
| `PluralForms<T>` | `{ other: T } & Partial<Record<"zero" \| "one" \| "two" \| "few" \| "many", T>>`            |
| `Formatters`     | `{ plural, number, date, relativeTime, list }` with the `locale` argument removed from each |

See [Formatting & Plurals](../guide/formatting.md) for when to use these and when an ICU message is the better choice.
