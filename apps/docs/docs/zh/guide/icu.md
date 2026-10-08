# ICU 消息

词典中的字符串可以是 [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) 消息。向 `t` 传入一个值对象，Dialex 就会按当前 locale 格式化该消息。

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
t("cart.owner"); // no values: the string is returned unchanged
```

ICU 消息可以与普通字符串和[函数值](./dictionaries.md#values)并存；现有词典不受任何影响。消息只会解析一次并被缓存。

## 语法

| 语法       | 示例                                                                                         | 说明                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 参数       | `{name}`                                                                                     | 任意值；通过 `String()` 转换                                                                              |
| 数字       | `{n, number}`, `{n, number, integer}`, `{n, number, percent}`, `{n, number, ::currency/USD}` | `Intl.NumberFormat`                                                                                       |
| 日期、时间 | `{d, date, long}`, `{d, time, short}`                                                        | 样式为 `short`、`medium`（默认）、`long`、`full`；值可以是 `Date`、时间戳或日期字符串                     |
| 复数       | `{n, plural, =0 {none} one {# item} other {# items}}`                                        | `=N` 精确匹配，其后是该 locale 的 CLDR 类别（`zero`、`one`、`two`、`few`、`many`、`other`）。`other` 必填 |
| 复数偏移   | `{n, plural, offset:1 =0 {nobody} one {you and # other} other {you and # others}}`           | `#` 和类别使用 `n - offset`；`=N` 匹配原始的 `n`                                                          |
| 序数       | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`                              | 序数复数规则                                                                                              |
| 选择       | `{gender, select, female {She} male {He} other {They}}`                                      | 把值作为字符串进行匹配。`other` 必填                                                                      |
| `#`        | 在复数分支内                                                                                 | 格式化后的数字。嵌套在复数中的 `select` 仍然指向外层的复数                                                |
| 引用       | `'{'`, `'}'`, `''`                                                                           | `''` 表示一个撇号。不在花括号之前的单个 `'` 是字面文本                                                    |

分支可以包含上述任何内容，因此复数和选择可以嵌套。

### 不支持的内容

- `<b>…</b>` 这样的富文本标签不会被解析；它们只是普通文本。
- 除 `::percent` 和 `::currency/XXX` 之外的数字 skeleton，以及日期 skeleton，均不受支持。未知的数字或日期样式会回退到默认样式。

## 错误

如果消息无法格式化（例如缺少某个值），`t` 会记录一条警告并原样返回消息，因此有问题的字符串绝不会让页面崩溃。`formatMessage` 本身会抛出 `IcuFormatError`（值缺失或无效）或 `IcuSyntaxError`（附带位置）。

```ts
import { formatMessage } from "dialexjs";

formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: 3 });
```

## 类型

参数名称**不会**被类型检查：词典中的字符串类型为 `string`，所以 TypeScript 看不到其中的参数。不同 locale 之间的不一致改由 [`dialex check`](../cli/check.md) 发现。`t` 只检查字符串键是否收到值对象（或什么都不传），函数键则保留它们自己的参数类型。

## 工具

- [`dialex check`](../cli/check.md) 会报告无效的 ICU、使用了与默认 locale 不同参数的 locale，以及某种语言缺少的复数选项（例如俄语需要 `few` 和 `many`）。
- [`dialex translate`](../cli/translate.md) 保持结构完整：参数、类型、`select` 键和精确的 `=N` 匹配必须保留，而复数类别可以变化。无法做到这一点的提供者（DeepL）永远不会收到 ICU 消息。
- [`dialex import`](../cli/import.md) 会拒绝无效 ICU 的值，或改变了其他 locale 中同一个键的参数的值。
- [`dialex export`](../cli/export.md) 把 ICU 消息作为普通字符串写出。请让翻译人员保持 `{ }` 内的整个结构，只翻译分支中的文本。
