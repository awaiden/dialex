# Dialex 如何工作

Dialex 把你的翻译保存在 TypeScript 中，在应用运行之前把它们变成一个生成的模块和一组类型声明，并用普通的对象查找把它们读回来。本页是一张地图：读一遍，文档的其余部分就各归其位。

## 流水线

```text
  src/home.content.ts            dialex generate              your app at runtime
  ┌────────────────────┐        ┌──────────────────┐        ┌───────────────────────┐
  │ defineDictionary(  │  ───►  │ dialex.generated │  ───►  │ adapter or provider   │
  │   "home", { en,tr })│        │   .ts            │        │ resolves the locale   │
  └────────────────────┘        │ dialex-env.d.ts  │        │ getDictionary / t()   │
        you write                └──────────────────┘        └───────────────────────┘
                                    CLI, build time              runtime, per request
```

1. **你编写词典。** 每个词典一个 `*.content.ts` 文件，放在使用它的代码旁边，每个都是一次 `defineDictionary("name", { en: {...}, tr: {...} })` 调用。参见[词典](./dictionaries.md)。
2. **`dialex generate` 编译它们。** 它从语法树读取这些文件（不运行你的代码），写出 `dialex.generated.ts`（词典和你配置中可安全用于客户端的副本）和 `dialex-env.d.ts`（类型）。参见 [`dialex generate`](../cli/generate.md)。
3. **适配器解析 locale。** 在服务端它查看 URL、查询字符串、Cookie 和 `Accept-Language`；在 UI 框架中，由 Provider 保存当前 locale。参见 [Locale 检测](./locale-detection.md)。
4. **你的代码读取词典。** `getDictionary("home").title`、`t("home.title")` 或一个 Hook。这是一次对象查找，传入值时再加上 ICU 格式化。

运行时没有任何东西会扫描文件系统，也没有任何东西被解析两次：ICU 消息在首次使用时只编译一次。

## 各个部分是什么

| 部分       | 是什么                                                               | 位于何处                          |
| ---------- | -------------------------------------------------------------------- | --------------------------------- |
| 词典       | 把每个 locale 映射到其内容的具名对象：字符串、嵌套对象、函数         | `*.content.ts`                    |
| 键路径     | 一个值的地址：`home.nav.about` 即词典 `home`、键 `nav.about`         | 在 `t("home.nav.about")` 中       |
| 配置       | `defaultLocale`、`locales`、`fallbacks`、`lazy`、`translate`……       | `dialex.config.ts`                |
| 生成的模块 | 词典和设置，合成一个可导入的文件                                     | `dialex.generated.ts`（不要编辑） |
| 类型声明   | 扩充 `DictionaryRegistry`，使名称和路径可以自动补全并受到检查        | `dialex-env.d.ts`（不要编辑）     |
| 适配器     | 框架的衔接层：解析 locale，并给你 `getDictionary` 和 `t`             | `dialexjs/<framework>`            |
| CLI        | `generate`、`check`、`export`、`import`、`translate`、`lock`、`init` | `@dialexjs/cli`                   |
| 编辑器工具 | 诊断、悬停、转到定义、补全和快速修复，与 `check` 使用同一套分析      | VS Code 扩展、语言服务器、Zed     |

## 什么在何时决定

| 决定时机             | 什么                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| 编写时               | 存在哪些键，以及每个键的类型                                                 |
| `dialex generate`    | 生成的模块和类型。对词典或配置的更改，要等你再次运行它才会生效               |
| `dialex check`（CI） | 每个 locale 是否具有每个键、ICU 消息是否有效且一致、代码引用的键是否真实存在 |
| 请求或渲染           | locale，进而决定读取哪些内容；ICU 值在这里被格式化                           |

由于类型来自生成的文件，**忘记运行 `dialex generate` 是“类型不对”最常见的原因**。开发时运行 `dialex generate --watch`，使用编辑器扩展（它在保存时重新生成），并让 `dialex check` 在文件过期时使 CI 失败。

## 表达一条消息的三种方式

| 形式       | 示例                                                     | 适用于                                                                      |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| 普通字符串 | `title: "Welcome"`                                       | 不含值的文本                                                                |
| ICU 字符串 | `items: "{count, plural, one {# item} other {# items}}"` | 值、复数、select、数字和日期；可与翻译人员的工具配合                        |
| 函数       | `` greeting: (name: string) => `Hello, ${name}!` ``      | 完整的 TypeScript，包括 `plural()` 和其他[格式化函数](../api/formatting.md) |

三者可以放在同一个词典中。参见 [ICU 消息](./icu.md)和[格式化与复数](./formatting.md)。

## 接下来去哪里

- 开始一个项目：[快速开始](./getting-started.md)，然后是你的[框架](../frameworks/README.md)。
- 查阅内容：[API 参考](../api/README.md)和 [CLI 参考](../cli/README.md)。
- 出了问题：[故障排查](./troubleshooting.md)。
