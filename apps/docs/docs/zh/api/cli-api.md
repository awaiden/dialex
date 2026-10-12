# CLI API

`@dialexjs/cli/api` 是 [VS Code 扩展](../guide/vscode.md)和语言服务器所基于的编程 API。它从语法树读取词典和配置，**不会运行项目代码**，下面标出的两个可选函数除外。

```ts
import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
```

## 分析

### `analyzeProject(options)`

```ts
function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult>;
```

找出项目的词典，检查 locale 一致性、ICU 消息、锁文件中的过期翻译以及源码中的引用，并返回问题列表。`dialex check` 是它之上的一层薄封装。

| 选项      | 类型             | 默认值                | 说明                                                                              |
| --------- | ---------------- | --------------------- | --------------------------------------------------------------------------------- |
| `root`    | `string`         | —                     | 项目文件夹。必填                                                                  |
| `config`  | `AnalysisConfig` | —                     | `defaultLocale`、`locales`、`include`、`exclude`。必填                            |
| `src`     | `string[]`       | `DEFAULT_SOURCE_GLOB` | 要扫描引用的源码 glob。传入 `[]` 则跳过扫描                                       |
| `runtime` | `boolean`        | `false`               | **会运行项目代码。** 导入语法树无法描述的词典（展开、计算键）。编辑器必须保持关闭 |
| `ignore`  | `string[]`       | —                     | 更多忽略 glob，相对于 `root`（嵌套项目）                                          |
| `unused`  | `boolean`        | `true`                | 报告可能未使用的键和词典                                                          |
| `lock`    | `boolean`        | `true`                | 报告自 `dialex.lock.json` 记录之后源文本发生变化的翻译                            |
| `cache`   | `AnalysisCache`  | —                     | 在多次调用之间复用已解析的词典和已扫描的源文件。与 `runtime` 一起使用时被忽略     |

返回结果：

| 字段                 | 类型                   | 说明                           |
| -------------------- | ---------------------- | ------------------------------ |
| `issues`             | `AnalysisIssue[]`      | 发现的全部问题。见下表         |
| `dictionaries`       | `AnalyzedDictionary[]` | 每个可读取的词典一项           |
| `files`              | `string[]`             | 每个匹配到的词典文件的绝对路径 |
| `sourceFilesScanned` | `number`               | 为查找引用而扫描的源文件数量   |

`AnalysisIssue` 包含 `file`、`level`（`"error" \| "warning" \| "info"`）、`code`（[见代码列表](../guide/diagnostics.md)）、`message`，以及已知时的 `range`（由 `{ line, column }` 组成的从零开始的 `{ start, end }`）、`dictionary`、`locale`、`path` 和 `sourceLocale`（对 `missing-key`：可从中复制该键的 locale）。

`AnalyzedDictionary` 包含 `name`、`file`、`locales`、`leaves`（`locale -> 点分路径 -> { kind, value? }`）、`paths`（点分路径的并集），以及静态读取时用于编辑的 `df`。

### 其他分析导出

| 导出                       | 说明                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `createAnalysisCache()`    | 供长期运行的调用方使用的 `AnalysisCache`。复用未变化的内容（按修改时间和大小判断）                   |
| `clearGitignore(cache)`    | 清除缓存的 `.gitignore` 规则，例如在 `.gitignore` 改变之后                                           |
| `scanReferences(text)`     | 在源文本中查找 `getDictionary("x")` 形式和 `t("x.y.z")` 的引用。返回 `{ kind, value, start, end }[]` |
| `relativeFile(root, file)` | 相对于根目录、使用正斜杠的路径，用于显示                                                             |
| `DEFAULT_SOURCE_GLOB`      | `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`                                                  |

## 扫描文件

| 导出                                  | 说明                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `scanFiles(root, patterns, options?)` | 在 `root` 下查找文件，跳过构建输出、配置的排除项和 Git 忽略的路径。选项：`kind`、`exclude`、`ignore`、`gitignore`、`gitignoreFilter` |
| `createGitignoreFilter(root)`         | 返回判断绝对路径是否被 Git 忽略的函数，读取项目、其父级和嵌套文件夹的 `.gitignore`                                                   |
| `BUILTIN_IGNORE`                      | 永远不包含词典或源码的文件夹                                                                                                         |
| `SOURCE_BUILTIN_IGNORE`               | 源码扫描额外跳过的内容：其他工具的输出、声明文件、生成文件和配置文件                                                                 |

## 编辑词典

这些辅助函数在语法树上工作，并保留文件的其余部分，包括注释和格式。

| 导出                                                       | 说明                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `parseDictionaryText(file, text)`                          | 解析词典的源文本（例如未保存的缓冲区）。结构不可编辑时返回 `undefined`；语法错误时抛出 |
| `loadDictionaryFile(file)`                                 | 加载文件。结构不可编辑时返回 `undefined`                                               |
| `renderDictionaryFile(df)`                                 | 应用了全部编辑后的源文本，不写入                                                       |
| `saveDictionaryFile(df)`                                   | 写入编辑后的文件                                                                       |
| `listLocales(df)`、`listLeaves(df, locale)`                | locale 列表，以及某个 locale 按源码顺序排列的每个叶子 `{ path, kind, value? }`         |
| `hasPath(df, locale, path)`、`getString(df, locale, path)` | 某个键是否存在，及其字符串值                                                           |
| `setString(df, locale, path, value)`                       | 设置或创建字符串。返回 `"created"`、`"updated"` 或 `"skipped"`（函数永远不会被覆盖）   |
| `copyLeaf(df, from, to, path, mapString?)`                 | 在 locale 之间复制叶子，可选地改写字符串。没有可复制内容或目标已有该键时返回 `false`   |
| `locationOf(df, locale, path?)`                            | 某个 locale 或某个键的属性名所在范围                                                   |
| `dictionaryLocation(df)`                                   | 以 locale 为键的那个对象的范围                                                         |
| `getLeafSource(df, locale, path)`                          | 叶子值的源代码                                                                         |
| `TODO_PREFIX`                                              | `"[TODO] "`：`--fix` 放在被复制字符串之前的前缀                                        |

## 配置

| 导出                             | 说明                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `readStaticConfig(root, file?)`  | 从语法树读取 `dialex.config.*`：`{ config, file?, notes }`。`notes` 列出不是字面量、因而保留默认值的设置 |
| `parseStaticConfig(text, file?)` | 对源文本做同样的事                                                                                       |
| `DEFAULT_STATIC_CONFIG`          | 某项设置无法读取时使用的默认值                                                                           |

## 项目与生成

| 导出                                                            | 说明                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `loadStaticProject(root, configFile?)`                          | 配置（来自语法树）和每个词典文件，可直接读取和编辑。不会运行项目代码          |
| `loadProject(root, configFile?)`                                | **会运行项目代码**：在加载词典之前先求值 `dialex.config.*`                    |
| `toKey(dictionary, path)`                                       | `("home", ["nav", "about"])` 变为 `"home.nav.about"`                          |
| `renderGenerated(root, options?)`                               | 不写入地计算 `dialex.generated.ts` 和 `dialex-env.d.ts`，用来判断它们是否最新 |
| `generateDictionaries(root, options?)`                          | 写入生成文件。`options.static` 读取配置但不执行它                             |
| `startGenerateWatcher(root, options, regenerate, delay?, log?)` | 词典或配置文件被添加、编辑或删除时重新生成                                    |

## 锁文件

| 导出                                      | 说明                                                              |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `LOCK_FILE`                               | `"dialex.lock.json"`                                              |
| `readLock(root)`、`writeLock(root, lock)` | 读取锁文件（或 `undefined`），并以排序后的键写入                  |
| `hashSource(text)`                        | 为源字符串保存的简短指纹                                          |
| `isStale(lock, locale, key, text)`        | 当该键是根据不同的源文本记录的时返回 `true`。没有记录的键不算过期 |

## 类型

`AnalysisCache`、`AnalysisConfig`、`AnalysisIssue`、`AnalysisOptions`、`AnalysisResult`、`AnalyzedDictionary`、`IssueCode`、`IssueLevel`、`LeafInfo`、`Reference`、`ScanOptions`、`Lockfile`、`DictionaryFile`、`Leaf`、`LeafKind`、`SourceRange`、`StaticConfig`、`StaticConfigResult`、`Project`、`ProjectDictionary`、`GenerateOptions`、`RenderedGenerate`。
