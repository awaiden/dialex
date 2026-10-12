# Formato

Ayudantes sensibles al locale construidos sobre `Intl`, exportados desde `dialexjs`. Cada formateador de `Intl` se crea una vez por locale y opciones y se reutiliza, así que llamar a un ayudante en una función de render o en un manejador de peticiones es barato. Para mensajes con argumentos usa [mensajes ICU](./icu.md); estos ayudantes son para valores que formateas tú mismo, normalmente dentro de un mensaje de función.

## `plural(locale, count, forms)`

```ts
function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T;
```

Elige la forma para `count` con las reglas CLDR del locale. `forms.other` es obligatorio y se usa cuando la categoría del locale no tiene forma propia.

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

`value` puede ser un `Date`, una marca de tiempo o cualquier cosa que acepte `new Date(value)`.

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

Un `value` negativo está en el pasado.

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

Los cinco ayudantes anteriores con el locale ya fijado.

```ts
const f = formatters("tr");
f.number(1234.5); // "1.234,5"
```

<a id="types"></a>

## Tipos

| Tipo             | Definición                                                                           |
| ---------------- | ------------------------------------------------------------------------------------ |
| `PluralCategory` | `"zero" \| "one" \| "two" \| "few" \| "many" \| "other"`                             |
| `PluralForms<T>` | `{ other: T } & Partial<Record<"zero" \| "one" \| "two" \| "few" \| "many", T>>`     |
| `Formatters`     | `{ plural, number, date, relativeTime, list }` sin el argumento `locale` en cada uno |

Consulta [Formato y plurales](../guide/formatting.md) para saber cuándo usar estos ayudantes y cuándo es mejor un mensaje ICU.
