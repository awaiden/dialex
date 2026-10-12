# Biçimlendirme

`Intl` üzerine kurulu, yerel ayara duyarlı yardımcılar; `dialexjs` içinden dışa aktarılır. Her `Intl` biçimlendiricisi yerel ayar ve seçenek başına bir kez oluşturulur ve yeniden kullanılır; bu yüzden bir yardımcıyı render fonksiyonunda ya da istek işleyicisinde çağırmak ucuzdur. Argümanlı mesajlar için [ICU mesajlarını](./icu.md) kullanın; bu yardımcılar, genellikle bir fonksiyon mesajının içinde, kendiniz biçimlendirdiğiniz değerler içindir.

## `plural(locale, count, forms)`

```ts
function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T;
```

`count` için biçimi yerel ayarın CLDR kurallarıyla seçer. `forms.other` zorunludur ve yerel ayarın kategorisinin kendi biçimi yoksa o kullanılır.

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

`value` bir `Date`, bir zaman damgası ya da `new Date(value)`'nun kabul ettiği herhangi bir şey olabilir.

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

Negatif `value` geçmiştedir.

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

Yukarıdaki beş yardımcı, yerel ayar önceden bağlanmış halde.

```ts
const f = formatters("tr");
f.number(1234.5); // "1.234,5"
```

<a id="types"></a>

## Tipler

| Tip              | Tanım                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `PluralCategory` | `"zero" \| "one" \| "two" \| "few" \| "many" \| "other"`                                     |
| `PluralForms<T>` | `{ other: T } & Partial<Record<"zero" \| "one" \| "two" \| "few" \| "many", T>>`             |
| `Formatters`     | `{ plural, number, date, relativeTime, list }`; her birinden `locale` argümanı çıkarılmıştır |

Bu yardımcıların ne zaman, bir ICU mesajının ne zaman daha iyi olduğu için [Biçimlendirme ve çoğullar](../guide/formatting.md) sayfasına bakın.
