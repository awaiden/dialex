# 格式化与复数

Dialex 提供了一组基于 `Intl` 的小型带类型辅助函数。它们位于 `dialex` 包中，在任何运行词典函数的地方都可以使用：服务端或客户端。

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

## 辅助函数

| 辅助函数                                   | 基于                      | 说明                                                                 |
| ------------------------------------------ | ------------------------- | -------------------------------------------------------------------- |
| `plural(locale, count, forms)`             | `Intl.PluralRules`        | `other` 必填；`zero`、`one`、`two`、`few`、`many` 可选               |
| `number(locale, value, options?)`          | `Intl.NumberFormat`       | 货币、百分比、单位、紧凑表示法                                       |
| `date(locale, value, options?)`            | `Intl.DateTimeFormat`     | 接受 `Date`、时间戳或 ISO 字符串                                     |
| `relativeTime(locale, value, unit, opts?)` | `Intl.RelativeTimeFormat` | `relativeTime("en", -1, "day", { numeric: "auto" })` → `"yesterday"` |
| `list(locale, values, options?)`           | `Intl.ListFormat`         | `list("en", ["a", "b", "c"])` → `"a, b, and c"`                      |
| `formatters(locale)`                       | 以上全部                  | 返回已绑定到某个 locale 的辅助函数，无需再传 `locale` 参数           |

`plural` 遵循 locale 的 CLDR 规则：英语使用 `one`/`other`，法语把 0 和 1 视为 `one`，俄语和阿拉伯语使用 `few`/`many`（阿拉伯语还有 `zero`/`two`）。如果某个 locale 的类别没有对应的形式，则使用 `other`。

对于写成带有 `{count, plural, ...}` 的普通字符串的消息，请参见 [ICU 消息](./icu.md)。

这些辅助函数把 locale 作为显式参数，因为每个 locale 的内容都写在词典各自的块里。
