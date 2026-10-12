# 类型

`dialexjs` 的类型，以及两个生成文件的内容。除非另有说明，本页的一切都是类型；用 `import type { Locales } from "dialexjs"` 导入。

## 生成的文件

`dialex generate` 会并排写出两个文件（参见 [`dialex generate`](../cli/generate.md)）。

**`dialex.generated.ts`** 导出：

| 导出            | 说明                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| `dictionaries`  | 词典定义的数组。也是默认导出                                                                 |
| `dictionaryMap` | `{ [name]: dictionary }`，用于直接查找                                                       |
| `config`        | 可安全用于客户端的设置：`defaultLocale`、`locales`、`fallbacks`、`prefixDefault`、`lazy`     |
| `locales`       | 以只读元组表示的已配置 locale，适合用于语言切换器                                            |
| `Locale`        | `(typeof locales)[number]`：已配置 locale 的联合类型                                         |
| `dialex`        | `{ dictionaries, config }`，懒加载时为 `{ config, loaders }`。把它展开传给 Provider 或适配器 |

**`dialex-env.d.ts`** 会扩充 `dialexjs` 以及你所用各框架入口点的 `Register`、`DictionaryRegistry` 和 `MessageArguments`。`getDictionary("home")` 和 `t("home.title")` 之所以有类型，就是因为它。请把它包含进你的 `tsconfig.json`。

## 注册表

这些是由生成的声明来填充的空接口。

| 接口                 | 被扩充为                                                                               | 作用                                              |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Register`           | `locales: "en" \| "tr"`                                                                | 把 `Locales` 收窄为你配置的 locale                |
| `DictionaryRegistry` | 每个词典一个属性：其名称和内容类型                                                     | 为词典名称、`getDictionary` 和 `t()` 路径提供类型 |
| `MessageArguments`   | `{ "cart.items": { count: number } }`：按 `dictionary.key` 路径给出每条消息的 ICU 参数 | 会检查 `t("cart.items", { count })`               |

## 辅助类型

| 类型                         | 定义                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Locales`                    | 你配置的 locale 的联合类型，在运行 `dialex generate` 之前为 `string`                                    |
| `DictionaryKey`              | 词典名称：已注册的名称（带自动补全），没有注册时为任意 `string`                                         |
| `ResolveDictionaryType<K>`   | 名为 `K` 的词典的内容类型，或 `any`                                                                     |
| `Dictionary<T>`              | `Record<Locales, T>`：每个 locale 一个内容对象                                                          |
| `DictionaryDefinition<N, T>` | `{ name: N; dictionary: Record<string, T> }`：`defineDictionary` 的返回值                               |
| `Translate`                  | `t` 的类型：`<P extends TranslationPath>(path: P, ...args: TranslationArgs<P>) => TranslationResult<P>` |
| `TranslationPath`            | 已注册词典的每个 `dictionary.key.path`，或 `string`                                                     |
| `TranslationArgs<P>`         | 函数叶子自身的参数；ICU 消息为 `[values: MessageArguments[P]]`；否则为 `[values?: IcuValues]`           |
| `TranslationResult<P>`       | 字符串，或函数叶子的返回类型                                                                            |
| `PathsOf<T>`                 | 词典内容类型 `T` 中每个叶子的点分路径                                                                   |

## 示例

```ts
import type { Locales } from "dialexjs";

import { locales, type Locale } from "./dialex.generated";

// "en" | "tr" once `dialex generate` has run
const current: Locales = "tr";

// the same union, from the generated file
const options: readonly Locale[] = locales;
```

相关类型位于使用它们的函数所在的页面：[`DialexConfig`](./core.md#dialexconfig)、[`DialexSource`](./core.md#generated-file-types)、[`PluralForms`](./formatting.md#types) 和 [`IcuValues`](./icu.md#types-and-errors)。
