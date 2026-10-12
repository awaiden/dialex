# 格式化

基于 `Intl` 的、感知 locale 的辅助函数，从 `dialexjs` 导出。每个 `Intl` 格式化器按 locale 和选项只创建一次并被复用，因此在渲染函数或请求处理器中调用辅助函数开销很小。带参数的消息请使用 [ICU 消息](./icu.md)；这些辅助函数用于你自己格式化的值，通常在函数消息内部使用。

## `plural(locale, count, forms)`

```ts
function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T;
```

按 locale 的 CLDR 规则为 `count` 选择对应形式。`forms.other` 必填，当该 locale 的类别没有自己的形式时使用它。

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

`value` 可以是 `Date`、时间戳，或 `new Date(value)` 接受的任何值。

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

负的 `value` 表示过去。

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

上面五个辅助函数，已经绑定了 locale。

```ts
const f = formatters("tr");
f.number(1234.5); // "1.234,5"
```

<a id="types"></a>

## 类型

| 类型             | 定义                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `PluralCategory` | `"zero" \| "one" \| "two" \| "few" \| "many" \| "other"`                         |
| `PluralForms<T>` | `{ other: T } & Partial<Record<"zero" \| "one" \| "two" \| "few" \| "many", T>>` |
| `Formatters`     | `{ plural, number, date, relativeTime, list }`，每个函数都去掉了 `locale` 参数   |

何时使用这些辅助函数、何时 ICU 消息更合适，参见[格式化与复数](../guide/formatting.md)。
