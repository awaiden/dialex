# ICU 消息

ICU MessageFormat 的解析器和格式化器。`dialexjs` 重新导出 `formatMessage`、`parseMessage`、错误类以及节点和值类型；`dialexjs/icu` 还额外导出内省辅助函数，并且不会加载其余运行时。消息语法本身见 [ICU 消息](../guide/icu.md)。

```ts
import { formatMessage } from "dialexjs/icu";
```

## `formatMessage(locale, message, values?)`

```ts
function formatMessage(locale: string, message: string | IcuNode[], values?: IcuValues): string;
```

| 参数      | 说明                                   |
| --------- | -------------------------------------- |
| `locale`  | 用于复数规则、数字和日期的 BCP 47 标签 |
| `message` | 消息文本，或 `parseMessage` 返回的节点 |
| `values`  | 按名称给出的参数。默认 `{}`            |

```ts
formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
// "3 items"
```

字符串消息只编译一次并缓存（最多 500 条不同的消息），因此再次格式化同一条消息不会重新解析。

| 抛出             | 何时                                                      |
| ---------------- | --------------------------------------------------------- |
| `IcuSyntaxError` | 消息不是有效的 ICU                                        |
| `IcuFormatError` | 缺少值，或 `plural`/`number` 参数不是有限数字，或日期无效 |

## `parseMessage(message)`

```ts
function parseMessage(message: string): IcuNode[];
```

把消息解析为节点，并在出错时抛出带有问题位置的 `IcuSyntaxError`。可用它来校验消息或检查其参数。

## `getArguments(nodes)`

```ts
function getArguments(nodes: IcuNode[]): IcuArgument[];
```

按首次出现的顺序列出已解析消息中不同的参数，包括嵌套分支中的参数。

```ts
getArguments(parseMessage("{n, plural, one {# file} other {# files}} for {name}"));
// [{ name: "n", type: "plural", selectors: ["one", "other"] }, { name: "name", type: "argument" }]
```

## `argumentSignature(nodes)`

```ts
function argumentSignature(nodes: IcuNode[]): string;
```

对消息参数的可比较描述，会忽略 plural 和 select 分支的文本。同一个键的两条翻译只要使用相同的参数，签名就相同；`dialex check` 用它来报告 `icu-args-mismatch`。

## `isIcuStructured(message)`

```ts
function isIcuStructured(message: string): boolean;
```

消息是否使用了 `plural`、`selectordinal`、`select`、`number`、`date` 或 `time`，而不只是普通的 `{name}` 占位符。它决定了对解析错误的严格程度。

## `findPlurals(nodes)`

```ts
function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[];
```

已解析消息中的每个 `plural` 和 `selectordinal` 节点，包括嵌套的。`dialex check` 用它来找出某种语言需要、而消息缺少的复数类别。

<a id="types-and-errors"></a>

## 类型与错误

| 名称              | 说明                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `IcuNode`         | 已解析消息的一个节点：`literal`、`argument`、`number`、`date`、`time`、`plural`、`select` 或 `pound`（`#`） |
| `IcuValue`        | `string \| number \| boolean \| Date \| null \| undefined`                                                  |
| `IcuValues`       | `Record<string, IcuValue>`                                                                                  |
| `IcuArgument`     | `{ name, type, selectors? }`：消息的一个参数                                                                |
| `IcuArgumentType` | `"argument" \| "number" \| "date" \| "time" \| "plural" \| "selectordinal" \| "select"`                     |
| `IcuSyntaxError`  | 继承 `Error`。`position` 是问题在消息中的从零开始的偏移量                                                   |
| `IcuFormatError`  | 继承 `Error`。在值缺失或无效时抛出                                                                          |
