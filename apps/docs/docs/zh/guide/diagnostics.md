# 诊断参考

Dialex 报告的每个问题都有代码、严重程度和消息。同样的检查在 [`dialex check`](../cli/check.md)、[VS Code 扩展](./vscode.md)和[语言服务器](./zed.md)中运行，因此一个问题在任何地方看起来都一样。

## 严重程度

| 严重程度  | 含义                           | 在 `dialex check` 中                                                      | 在编辑器中 |
| --------- | ------------------------------ | ------------------------------------------------------------------------- | ---------- |
| `error`   | 有问题，会在运行时或评审中失败 | 退出码 `1`                                                                | 错误       |
| `warning` | 很可能有问题，或尚未完成       | 会报告，退出码 `0`（`--fail-on-stale` 会把 `stale-translation` 变为错误） | 警告       |
| `info`    | 某个文件无法分析，这不算错误   | 不显示                                                                    | 信息       |

`unused-key` 和 `unused-dictionary` 在 `check` 中是警告；编辑器把它们显示为淡化文本（提示），以免充斥问题面板，并且只在 `unusedKeys` 设置开启时显示。

## 词典文件

| 代码                 | 严重程度 | 消息                                                                                    | 含义与修复                                                                                                                                                   |
| -------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `invalid-dictionary` | error    | `Failed to parse dictionary: ...`                                                       | 文件有语法错误。修复语法；消息会指出位置                                                                                                                     |
| `invalid-dictionary` | error    | `Default export does not appear to be a valid defineDictionary output.`                 | 仅在 `runtime` 分析时出现。`export default` 必须是 `defineDictionary(...)`                                                                                   |
| `invalid-locale`     | error    | `Locale "x" content is empty or invalid.`                                               | 仅在 `runtime` 分析时出现。某个 locale 的内容必须是对象                                                                                                      |
| `unanalyzable`       | info     | `This dictionary uses spreads, computed keys, imported values, or a computed name, ...` | 静态工具无法读取该文件。`dialex check` 会改为运行它；编辑器会跳过它。使用字面量对象才能获得编辑器支持（见[词典](./dictionaries.md#what-the-tools-can-read)） |
| `missing-locale`     | error    | `Missing configured locale "de"`                                                        | `locales` 中的某个 locale 在此词典里没有内容。添加它，或运行 `dialex check --fix`                                                                            |
| `missing-key`        | error    | `Locale "tr" is missing key "nav.about"`                                                | 其他 locale 有这个键。添加它，运行 `--fix`（复制该值并加上 `[TODO]` 标记），或使用编辑器的快速修复                                                           |
| `todo-placeholder`   | warning  | `Locale "tr" key "title" still has a [TODO] placeholder`                                | 某个值仍以 `--fix` 留下的 `[TODO] ` 开头。翻译它，或运行 [`dialex translate`](../cli/translate.md)                                                           |
| `stale-translation`  | warning  | `Locale "tr" key "title" is out of date: the "en" text changed after it was translated` | 在翻译被记录进 `dialex.lock.json` 之后，源文本发生了变化。更新翻译，然后运行 `dialex lock`                                                                   |

## ICU 消息

| 代码                    | 严重程度 | 消息                                                                                                                         | 含义与修复                                                                                                |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `invalid-icu`           | error    | `Invalid ICU message "a.items" (tr): ICU syntax error at 27: Missing required "other" option`                                | 字符串使用了 `plural`、`select`、`number`……却无法解析。消息给出位置。plural 和 select 必须有 `other` 分支 |
| `invalid-icu`           | warning  | `"a.soft" (en) contains braces but is not valid ICU, so t() values cannot be applied: ...`                                   | 含普通花括号的字符串无法解析，因此 `t()` 会原样返回它。请为字面花括号加引号：`'{'`                        |
| `icu-args-mismatch`     | error    | `Locale "tr" uses different arguments than "en" for "a.greeting" (expected name:any, found ad:any)`                          | 同一个键的各个翻译必须使用相同的参数名。在翻译中重命名该参数                                              |
| `icu-plural-categories` | warning  | `Locale "ru" plural "count" in "a.items" has no "few", "many" option (used by this language; "other" will be shown instead)` | 该语言需要的复数类别比消息提供的更多。把它们补上                                                          |

## 源代码

这些检查需要有源文件可扫描；没有时会被跳过。扫描的内容见 [`dialex check`](../cli/check.md#what-it-checks)。

| 代码                 | 严重程度 | 消息                                 | 含义与修复                                                                                               |
| -------------------- | -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `unknown-dictionary` | error    | `Unknown dictionary "zzz"`           | `getDictionary("zzz")`、`useDictionary("zzz")` 或 `@DialexDictionary("zzz")` 指向了不存在的词典          |
| `unknown-path`       | error    | `Unknown translation path "a.nope"`  | `t("a.nope")` 中的 `a` 是已知词典，但没有这个键。编辑器提供快速修复，会把该键添加到每个 locale           |
| `unused-key`         | warning  | `Key "only_en" is possibly unused`   | 没有任何源文件把该键的最后一段当作单词包含。这是启发式判断：动态访问不会被报告，部分未使用的键也可能漏报 |
| `unused-dictionary`  | warning  | `Dictionary "c" is never referenced` | 没有任何源文件包含该词典的名称                                                                           |

注释从不会被检查。在代码中用对象字面量 `dictionaries: { name: ... }` 注册的字典视为已知，因此用 `getDictionary("name")` 读取它不算错误。要让某个没有问题的引用不再报错，请在上一行的注释中写 `dialex-ignore-next-line`，或在同一行的注释中写 `dialex-ignore`：

```ts
// dialex-ignore-next-line
const d = getDictionary("from-a-plugin");
```

要在 ESLint 和 oxlint 中使用相同的检查，请参阅 [Lint](./linting.md)。

## 生成的文件

`dialex check` 还会忽略格式，把 `dialex.generated.ts` 和 `dialex-env.d.ts` 与 `dialex generate` 将要写出的内容进行比较。这一项没有代码：

| 严重程度 | 消息                                                                                   | 修复                   |
| -------- | -------------------------------------------------------------------------------------- | ---------------------- |
| error    | `Out of date with your dictionaries or config. Run `dx generate`(or`dx check --fix`).` | 运行 `dialex generate` |

## 输出格式

**人类可读**的输出按文件对问题分组，每条消息后面带有行号。

**`--json`** 只打印一个对象，别无其他：

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/features/a/a.content.ts",
      "name": "a",
      "errors": ["Missing configured locale \"de\""],
      "warnings": ["Key \"only_en\" is possibly unused"],
      "annotations": [
        { "level": "error", "message": "Missing configured locale \"de\"", "line": 3 }
      ]
    }
  ],
  "totalIssues": 1,
  "totalWarnings": 1,
  "fixed": 0
}
```

| 字段            | 说明                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`       | 至少有一个错误时为 `false`。此时退出码为 `1`                                                                                                                        |
| `diagnostics`   | 每个有问题的文件一项：`file`（相对于项目）、`name`（若是词典则为其名称）、`errors`、`warnings` 和 `annotations`（`level`、`message`，已知时还有从 1 开始的 `line`） |
| `totalIssues`   | 错误数量                                                                                                                                                            |
| `totalWarnings` | 警告数量                                                                                                                                                            |
| `fixed`         | `--fix` 插入了多少个值                                                                                                                                              |

**`--github`** 为每条注释打印一条工作流命令（`::error file=...,line=...,title=dialex::message`），GitHub 会把它显示在拉取请求的文件上。
