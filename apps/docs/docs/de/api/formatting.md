# Formatierung

Locale-bewusste Helfer auf Basis von `Intl`, exportiert aus `dialexjs`. Jeder `Intl`-Formatter wird pro Locale und Optionen einmal erzeugt und wiederverwendet; ein Aufruf in einer Render-Funktion oder einem Request-Handler ist also billig. Für Nachrichten mit Argumenten nimmst du [ICU-Nachrichten](./icu.md); diese Helfer sind für Werte, die du selbst formatierst, typischerweise in einer Funktionsnachricht.

## `plural(locale, count, forms)`

```ts
function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T;
```

Wählt die Form für `count` nach den CLDR-Regeln der Locale. `forms.other` ist erforderlich und wird verwendet, wenn die Kategorie der Locale keine eigene Form hat.

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

`value` darf ein `Date`, ein Zeitstempel oder alles sein, was `new Date(value)` akzeptiert.

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

Ein negativer `value` liegt in der Vergangenheit.

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

Die fünf Helfer von oben mit bereits gebundener Locale.

```ts
const f = formatters("tr");
f.number(1234.5); // "1.234,5"
```

<a id="types"></a>

## Typen

| Typ              | Definition                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `PluralCategory` | `"zero" \| "one" \| "two" \| "few" \| "many" \| "other"`                                  |
| `PluralForms<T>` | `{ other: T } & Partial<Record<"zero" \| "one" \| "two" \| "few" \| "many", T>>`          |
| `Formatters`     | `{ plural, number, date, relativeTime, list }` ohne das Argument `locale` in jedem Helfer |

Wann du diese Helfer und wann besser eine ICU-Nachricht nimmst, steht unter [Formatierung & Plurale](../guide/formatting.md).
