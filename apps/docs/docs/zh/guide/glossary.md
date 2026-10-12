# 术语表

Dialex 使用的术语，按字母顺序排列，并附有解释它们的页面链接。

| 术语                         | 含义                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **适配器（Adapter）**        | 解析请求的 locale，并为你的代码提供 `getDictionary` 和 `t` 的 `dialexjs/<framework>` 入口点。参见[服务端适配器](../api/server-adapters.md)         |
| **分析（Analysis）**         | 从语法树读取词典、配置和源代码以发现问题。它从不运行你的代码。由 `dialex check`、编辑器和语言服务器共用                                            |
| **参数（Argument）**         | ICU 消息中的具名值：`{name}`、`{count, plural, ...}`                                                                                               |
| **配置（Config）**           | `dialex.config.ts`：`defaultLocale`、`locales`、`include`、`fallbacks`、`lazy`、`translate`……参见[配置](./configuration.md)                        |
| **默认 locale**              | 请求或 Provider 没有其他决定时使用的 locale，也是其他 locale 的比较基准。配置中的 `defaultLocale`                                                  |
| **词典（Dictionary）**       | 把每个 locale 映射到其内容的具名对象。在 `*.content.ts` 文件中用 `defineDictionary` 定义。参见[词典](./dictionaries.md)                            |
| **诊断（Diagnostic）**       | Dialex 报告的问题，带有代码、严重程度和消息。参见[诊断参考](./diagnostics.md)                                                                      |
| **回退链（Fallback chain）** | 为某个键依次尝试的 locale 列表：该 locale、其显式回退、去掉地区的语言，然后是默认 locale。参见[回退](./fallbacks.md)                               |
| **函数消息**                 | 词典中作为函数的值：`` (name: string) => `Hello, ${name}` ``。由 TypeScript 提供类型                                                               |
| **生成的文件**               | 由 `dialex generate` 写出的 `dialex.generated.ts` 和 `dialex-env.d.ts`。不要编辑它们。参见 [`dialex generate`](../cli/generate.md)                 |
| **水合（Hydration）**        | 客户端框架附着到服务端渲染的 HTML 上。客户端首次渲染必须使用服务端的 locale（`initialLocale`）才能匹配                                             |
| **ICU 消息**                 | 采用 ICU MessageFormat 语法的字符串，带有参数、`plural`、`select`、数字和日期。参见 [ICU 消息](./icu.md)                                           |
| **键（Key）**                | 词典某个 locale 内部的名称。可以嵌套：`nav.about`                                                                                                  |
| **键路径（Key path）**       | 用点连接的词典名称和键：`home.nav.about`。就是你传给 `t()` 的内容。参见[键路径](./key-paths.md)                                                    |
| **懒加载**                   | 按需加载词典而不是全部打包，通过 `lazy: true` 或 `"locale"`。参见[懒加载](./lazy-loading.md)                                                       |
| **叶子（Leaf）**             | 词典中不是对象的值：字符串、函数或其他值                                                                                                           |
| **Locale**                   | 语言标签，如 `en`、`tr` 或 `pt-BR`                                                                                                                 |
| **锁文件**                   | `dialex.lock.json`：记录每条翻译根据哪段源文本翻译，以便发现之后源文本的变化。参见[保持翻译同步](../cli/translate.md#keeping-translations-in-sync) |
| **原生二进制**               | `dx` 和语言服务器的 Rust 版本。参见[原生二进制](./native.md)                                                                                       |
| **一致性（Parity）**         | 词典的每个 locale 都有相同的键（以及相同的 ICU 参数）。由 `dialex check` 检查                                                                      |
| **持久化（Persist）**        | 把用户选择的 locale 记在 Cookie 或 `localStorage` 中                                                                                               |
| **复数类别**                 | `zero`、`one`、`two`、`few`、`many`、`other` 之一：一种语言的复数规则所区分的形式（CLDR）                                                          |
| **Provider**                 | UI 框架中保存当前 locale 的组件或插件，如 `DialexProvider`                                                                                         |
| **注册表（Registry）**       | `dialex-env.d.ts` 用你的词典名称和类型填充的 `DictionaryRegistry` 接口。参见[类型](../api/types.md)                                                |
| **源 locale**                | 翻译所依据的 locale，通常是默认 locale。`translate.sourceLocale`                                                                                   |
| **过期的翻译**               | 根据锁文件，在翻译之后源文本发生了变化的翻译                                                                                                       |
| **静态分析**                 | 不运行代码而读取代码。用字面量写成的词典和配置可以被静态读取；展开、计算键和导入则不能。参见[词典](./dictionaries.md#what-the-tools-can-read)      |
| **`[TODO]` 占位符**          | `dialex check --fix` 放在被复制字符串前面的前缀，使它易于查找和翻译                                                                                |
