# VS Code 扩展

Dialex 扩展为翻译提供编辑器支持：诊断、悬停提示、转到定义、自动补全和快速修复。它位于仓库的 `packages/vscode` 中。

::: warning 状态
该扩展可以构建、打包成 `.vsix`，其逻辑由针对 VS Code API 替身运行的测试覆盖。它**尚未在真实的 VS Code 窗口中试用过**，也没有发布到 Marketplace。请按照[试一试](#try-it-out)自行运行，并反馈任何看起来不对的地方。
:::

## 安装

构建并打包扩展，然后安装 `.vsix`：

```bash
cd packages/vscode
bun run build
bun run package                      # creates dialex-vscode-0.1.0.vsix
code --install-extension dialex-vscode-0.1.0.vsix
```

## 功能

### 诊断

问题会直接在出错的位置加下划线：

| 位置               | 问题                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.content.ts` 文件 | 某个 locale 缺少其他 locale 已有的键，或缺少已配置的 locale；无效的 [ICU](./icu.md)；不同 locale 之间参数不一致；`dialex check --fix` 留下的 `[TODO]` 占位符 |
| 源代码             | 指向不存在内容的 `getDictionary("x")` 或 `t("x.y")`                                                                                                          |

某种语言缺少的复数类别（例如俄语的 `few`）会作为警告报告。开启 `dialex.unusedKeys` 后，没有任何源文件似乎在使用的键和词典会被淡化显示。

### 悬停提示

将鼠标悬停在 `t("home.title")` 中的键、`getDictionary("home")` 中的词典名称，或调用的成员（例如 `getDictionary("home").title` 中的 `.title`）上。表格会显示每个 locale 中的文本（默认 locale 排在最前），并标出缺失它的 locale。函数值会显示其源代码。

### 转到定义

在键上按 `F12` 或 Ctrl/Cmd 加点击，会跳转到它在词典中的书写位置（默认 locale 的条目，或第一个拥有它的 locale）。

### 自动补全

在 `t("…")`、`getDictionary("…")`、`useDictionary("…")` 或 `@DialexDictionary("…")` 的字符串内：

- 词典名称，附带键的数量和 locale；
- 在 `t("home.` 之后，显示该层级的键，并以默认 locale 的文本作为预览。分组以点号继续，并会重新打开列表。

### 快速修复

在诊断上使用灯泡（`Ctrl+.`/`Cmd+.`）：

- **Add "nav.contact" to tr (marked [TODO])** 会像 [`dialex check --fix`](../cli/check.md#fix) 一样，从默认 locale 复制值。
- **Add all N missing keys** 会对整个文件执行同样的操作。
- **Add "nav.pricing" to the "home" dictionary**（针对未知的 `t()` 路径）会在每个 locale 中以 `[TODO]` 占位符的形式创建该键。

修复会替换编辑器中文件的文本，因此可以撤销，并且在你保存之前不会写入任何内容。

## 设置

| 设置                  | 默认值  | 说明                                                                                              |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `dialex.enable`       | `true`  | 开启或关闭所有功能                                                                                |
| `dialex.unusedKeys`   | `false` | 淡化显示可能未使用的键和词典。它是基于单词匹配的启发式方法，因此默认关闭                          |
| `dialex.autoGenerate` | `true`  | 当词典或配置文件变化时，在已有生成文件的项目中重新生成 `dialex.generated.ts` 和 `dialex-env.d.ts` |
| `dialex.configPath`   | `""`    | 配置文件路径，相对于每个项目根目录                                                                |

命令 **Dialex: Refresh Diagnostics** 会重新分析所有内容。保存文件，或词典、配置文件发生变化时，诊断也会刷新。

命令 **Dialex: Regenerate dialex.generated.ts** 可按需执行。自动生成从语法树读取配置且从不运行它，在不受信任的工作区中会被跳过，并且只处理已有生成文件的项目，因此不会创建你没要求的文件。

## 项目

项目是包含 `dialex.config.*` 或 `i18n.config.*` 的文件夹。没有任何已配置项目包含的词典，会使用默认设置，归属于最近的含有 `package.json` 的文件夹。在 monorepo 中，每个项目单独分析，词典归属于最近的项目。

## 它从不运行你的代码

该扩展从语法树读取你的配置和词典，**从不执行项目代码**。这就是它能够声明支持不受信任的工作区的原因，这一点很重要，因为配置文件和词典本身就是代码。

代价是只能理解静态可见的值：

- 在 `dialex.config` 中，`defaultLocale`、`locales`、`include`、`fallbacks`、`prefixDefault` 和 `lazy` 必须是字面量。任何计算得出的值都会被忽略，并记录在 **Dialex** 输出通道中。
- 使用展开、计算键或导入值的词典无法分析。它只会得到一条提示信息，而不是诊断。[`dialex check`](../cli/check.md) 会导入这类文件并进行检查。

同样的分析也可以通过编程方式使用，即 `@dialexjs/cli/api`（`analyzeProject`、`readStaticConfig` 以及词典编辑辅助函数）。

<a id="try-it-out"></a>

## 试一试

在真实的 VS Code 窗口中从源码运行扩展：

1. 在 VS Code 中打开 `packages/vscode` 文件夹。
2. 按 `F5`（"Run Extension (examples)"）。这会构建扩展，并在仓库的 `examples/` 文件夹上打开第二个窗口。
3. 在那个窗口中打开一个示例，例如 `examples/react/src`：
   - 从 `home.content.ts` 的 `tr` 块中删除一个键：`tr` 上会出现红色下划线，快速修复会把该键加回去。
   - 将鼠标悬停在 `t("home.…")` 调用上，或在其上按 `F12`。
   - 在 `.tsx` 文件中输入 `t("home.`，查看补全建议。
4. 打开 **Dialex** 输出通道，查看有关无法静态读取的内容的提示。
