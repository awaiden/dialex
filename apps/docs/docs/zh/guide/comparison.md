# 对比

Dialex 与最常拿来比较的几个库有何不同：[i18next](https://www.i18next.com)、[FormatJS](https://formatjs.github.io)（`react-intl` 和 `intl-messageformat`）[Lingui](https://lingui.dev)、[Paraglide JS](https://paraglidejs.com) 和 [Intlayer](https://intlayer.org)。它们都是好库，哪一个合适取决于你的团队如何编写和翻译文本。

关于速度和大小的数据，请参见[基准测试](./benchmarks.md)。

## 一览

| 问题              | Dialex                                | i18next                     | FormatJS               | Lingui                                                     |
| ----------------- | ------------------------------------- | --------------------------- | ---------------------- | ---------------------------------------------------------- |
| 文本存放在哪里    | 与代码相邻的 TypeScript 词典          | JSON 资源，按命名空间加载   | 代码中的消息，加上目录 | 代码中的消息，提取到目录                                   |
| 消息语法          | ICU MessageFormat，或 TypeScript 函数 | 自己的 `{{value}}` 和复数键 | ICU MessageFormat      | ICU MessageFormat                                          |
| 带类型的键        | 由你的词典生成                        | 通过资源类型声明            | 消息 id 是字符串       | 没有键：源文本就是 id                                      |
| 带类型的 ICU 参数 | 由每条消息生成                        | 不属于键类型的一部分        | 默认没有               | 值来自模板，因此由 TypeScript 检查                         |
| 缺失的翻译        | `dialex check` 使构建失败             | 在运行时报告，并带回退      | 通过 `onError` 报告    | 由 `lingui extract` 统计；`lingui compile --strict` 会失败 |
| 提取步骤          | 没有：词典就是源                      | 可选工具                    | `formatjs extract`     | `lingui extract`                                           |
| 交付给翻译人员    | JSON、CSV 和 XLIFF 导出与导入         | JSON，许多服务可集成        | JSON，多种厂商格式     | PO 和 JSON 目录                                            |
| 懒加载            | 按词典或按 locale，自动生成           | 后端和命名空间              | 你自己的动态导入       | 你自己的动态导入                                           |

单元格描述的是各个库文档中的默认行为。它们都可以通过插件或你自己的代码扩展。

## Dialex 与 i18next

i18next 是 JavaScript 中使用最广泛的 i18n 库，拥有庞大的后端、语言检测器和框架绑定生态。它把翻译保存为 JSON 资源，并提供命名空间、回退和插件等运行时功能。

Dialex 做了不同的取舍。词典是 TypeScript，被编译成一个带类型的注册表，因此错误的键或参数是类型错误，缺少的 locale 会让 `dialex check` 在发布前失败。没有需要配置的运行时资源加载；配合[懒加载](./lazy-loading.md)，词典就是一个被代码拆分的模块。

当你需要它的插件生态、在运行时获取翻译的后端，或不绑定 TypeScript 的运行时，请选择 i18next。当你希望编译器守护你的文本时，请选择 Dialex。

## Dialex 与 FormatJS

FormatJS 是 JavaScript 中 ICU MessageFormat 的参考实现，`react-intl` 在它之上构建 React 组件。消息在代码中用 `defineMessages` 或 `formatMessage` 定义，用 `formatjs` CLI 提取，并且可以预编译。

Dialex 使用相同的消息语法，因此 ICU 消息可以直接沿用。区别在于周边的工作流：Dialex 不需要提取步骤，因为词典就是源，并且它会为键和参数生成类型。运行时也更小，如[基准测试](./benchmarks.md)所示。

当你想要标准实现及其 React 组件，或你的翻译流程围绕 `formatjs extract` 构建时，请选择 FormatJS。

## Dialex 与 Lingui

Lingui 把消息保留在源码中（`t` 和 `Trans` 宏），把目录提取为 PO 或 JSON，并编译成很小的运行时。结果是一个非常小的包，以及在组件中直接写英文文本的写作风格。

Dialex 则把文本放在词典里，因此一个键表达它的用途，每个 locale 在文件中并排放在一起。两种方式都使用 ICU MessageFormat。

当你更喜欢内联书写消息并且有基于 PO 的翻译流程时，请选择 Lingui。当你更喜欢有名字的键，并希望由类型系统检查它们时，请选择 Dialex。

## Paraglide JS 与 Intlayer 一览

另外两个同样在构建时工作的库，与 Dialex 并列：

| 问题              | Dialex                                | Paraglide JS                                             | Intlayer                                                    |
| ----------------- | ------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 文本存放在哪里    | 与代码相邻的 TypeScript 词典          | 每个 locale 一个 JSON 消息文件                           | 组件旁边的 `.content` 文件                                  |
| 消息语法          | ICU MessageFormat，或 TypeScript 函数 | inlang 格式；通过插件支持 ICU MessageFormat 1 和 i18next | 自己的节点（`t`、`plural`、`enu`、`select`），或 ICU        |
| 带类型的键        | 由你的词典生成                        | 每条消息都是生成的函数                                   | 通过每个声明上的 `Dictionary` 类型                          |
| 带类型的 ICU 参数 | 由每条消息生成                        | 生成函数的参数带有类型                                   | 其文档中未涉及                                              |
| 缺失的翻译        | `dialex check` 使构建失败             | inlang CLI 在 CI 中检查翻译                              | `intlayer content test` 会检查                              |
| 提取步骤          | 没有：词典就是源                      | 没有：消息直接写在 JSON 文件里                           | `intlayer extract` 把字符串移出组件                         |
| 交付给翻译人员    | JSON、CSV 和 XLIFF 导出与导入         | 面向非开发者的 Fink 编辑器；通过插件导入导出             | CMS 和编辑器，用 AI 的 `fill`，JSON 和 YAML 文件            |
| 懒加载            | 按词典或按 locale，自动生成           | 未使用的消息由打包器丢弃                                 | 每个词典可设置 `importMode`：`static`、`dynamic` 或 `fetch` |

## Dialex 与 Paraglide JS

[Paraglide JS](https://paraglidejs.com) 是 inlang 项目的编译器。消息保存在 JSON 文件中，编译器把每条消息变成带类型参数的函数（`m.greeting({ name })`），因此打包器可以丢弃你没用到的消息。消息格式可插拔：默认是 inlang 格式，插件可增加 ICU MessageFormat 1 和 i18next 文件。

Dialex 同样根据你的消息生成类型，但它把一个功能的文本放在同一个词典里，各个 locale 并排，并在一个小型运行时中执行 ICU 字符串。Paraglide 按消息拆分的函数能做到最细粒度的 tree-shaking；Dialex 的[懒加载](./lazy-loading.md)则按词典或按 locale 拆分。

当按消息的 tree-shaking 对你最重要，或你想用 inlang 的编辑器工具时，选择 Paraglide JS。当你更喜欢按功能分组的词典、把 ICU 字符串和函数消息放在同一个文件里，并希望在各 locale 之间做对等检查时，选择 Dialex。

## Dialex 与 Intlayer

[Intlayer](https://intlayer.org) 在每个组件旁边的 `.content` 文件（TypeScript、JSON、YAML 或 Markdown）中声明内容，每个文件带一个 `key`，并把它们构建成词典。围绕它还提供 CMS 和编辑器、用 AI 补全翻译的 `fill`、把字符串移出组件的 `extract`，以及查找缺失翻译的 `content test`。

Dialex 同样把文本放在代码旁边的 `*.content.ts` 文件中，但它始终是一个库加一个命令行工具：消息是普通的 ICU 字符串或函数，它接触的唯一服务就是你为 `dialex translate` 选择的那个。

当你想要面向非开发者的编辑器、带自有节点类型的按组件内容，以及工作流内置的 AI 补全时，选择 Intlayer。当你想要标准 ICU MessageFormat 且不想依赖托管服务时，选择 Dialex。

## Dialex 不适合的情形

- 你需要在运行时从某个服务加载或更改翻译，而不进行部署。
- 你的翻译人员使用只读取 PO 文件的工具，并且你不想增加转换步骤。Dialex 导出 JSON、CSV 和 XLIFF。
- 你的项目是纯 JavaScript。Dialex 的主要价值是它生成的类型。
- 你依赖只有 i18next、FormatJS 或 Lingui 提供的生态插件。

## 迁移到 Dialex

- 保持你的 ICU 消息不变；语法是一样的。
- 把每个命名空间或目录变成一个 `defineDictionary` 文件，让 `dialex check` 找出各 locale 之间不同的键。
- 用 [`dialex import`](../cli/import.md) 从 JSON、CSV 或 XLIFF 导入现有翻译。
