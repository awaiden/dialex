# ICU messages

The ICU MessageFormat parser and formatter. `dialexjs` re-exports `formatMessage`, `parseMessage`, the error classes and the node and value types; `dialexjs/icu` additionally exports the introspection helpers and does not load the rest of the runtime. For the message syntax itself see [ICU Messages](../guide/icu.md).

```ts
import { formatMessage } from "dialexjs/icu";
```

## `formatMessage(locale, message, values?)`

```ts
function formatMessage(locale: string, message: string | IcuNode[], values?: IcuValues): string;
```

| Parameter | Description                                             |
| --------- | ------------------------------------------------------- |
| `locale`  | The BCP 47 tag used for plural rules, numbers and dates |
| `message` | The message text, or nodes returned by `parseMessage`   |
| `values`  | The arguments by name. Default `{}`                     |

```ts
formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
// "3 items"
```

A string message is compiled once and cached (up to 500 distinct messages), so formatting the same message again does no parsing.

| Throws           | When                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `IcuSyntaxError` | The message is not valid ICU                                                                     |
| `IcuFormatError` | A value is missing, or a `plural`/`number` argument is not a finite number, or a date is invalid |

## `parseMessage(message)`

```ts
function parseMessage(message: string): IcuNode[];
```

Parses a message into nodes and throws `IcuSyntaxError` with the position of the problem. Use it to validate a message or to inspect its arguments.

## `getArguments(nodes)`

```ts
function getArguments(nodes: IcuNode[]): IcuArgument[];
```

Lists the distinct arguments of a parsed message, including those in nested branches, in order of first appearance.

```ts
getArguments(parseMessage("{n, plural, one {# file} other {# files}} for {name}"));
// [{ name: "n", type: "plural", selectors: ["one", "other"] }, { name: "name", type: "argument" }]
```

## `argumentSignature(nodes)`

```ts
function argumentSignature(nodes: IcuNode[]): string;
```

A comparable description of a message's arguments that ignores the text of plural and select branches. Two translations of one key have the same signature when they use the same arguments; `dialex check` uses it to report `icu-args-mismatch`.

## `isIcuStructured(message)`

```ts
function isIcuStructured(message: string): boolean;
```

Whether a message uses `plural`, `selectordinal`, `select`, `number`, `date` or `time`, as opposed to plain `{name}` placeholders. It decides how strictly a parse error is treated.

## `findPlurals(nodes)`

```ts
function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[];
```

Every `plural` and `selectordinal` node of a parsed message, including nested ones. `dialex check` uses it to find plural categories a language needs but the message lacks.

## Types and errors

| Name              | Description                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `IcuNode`         | A node of a parsed message: `literal`, `argument`, `number`, `date`, `time`, `plural`, `select` or `pound` (`#`) |
| `IcuValue`        | `string \| number \| boolean \| Date \| null \| undefined`                                                       |
| `IcuValues`       | `Record<string, IcuValue>`                                                                                       |
| `IcuArgument`     | `{ name, type, selectors? }`: one argument of a message                                                          |
| `IcuArgumentType` | `"argument" \| "number" \| "date" \| "time" \| "plural" \| "selectordinal" \| "select"`                          |
| `IcuSyntaxError`  | Extends `Error`. `position` is the zero-based offset of the problem in the message                               |
| `IcuFormatError`  | Extends `Error`. Thrown for missing or invalid values                                                            |
