# dialex check

检查你的词典以及代码如何使用它们。发现错误时它会以退出码 `1` 结束，因此适合 pre-commit 钩子和 CI。警告永远不会让运行失败。

```bash
dialex check
dialex check --json
dialex check --github
dialex check --fix
dialex lint -c ./dialex.config.ts
```

## 检查内容

**错误**

- 词典缺少某个已配置的 locale。
- 某个 locale 缺少其他 locale 已有的键。嵌套的键按点分路径比较，例如 `nav.about`。
- 明显使用了 [ICU](../guide/icu.md)（`plural`、`select`、`number` 等）的字符串不是有效的 ICU，或者某个 locale 对同一个键使用了与默认 locale 不同的参数。
- 源代码用不存在的词典调用 `getDictionary("x")`、`useDictionary("x")` 或 `@DialexDictionary("x")`。
- 源代码用不存在的路径调用 `t("home.nav.missing")`。只有第一段是已知词典名称的 `t()` 调用才会被检查，因此无关的 `t()` 函数会被忽略。
- 存在生成文件（`dialex.generated.ts` 或 `dialex-env.d.ts`），但已经过期。运行 `dialex generate`，或使用 `--fix`。

**警告**

- 某个键可能未被使用。这是一种启发式方法：只要键的最后一段在你的源代码中作为单词出现过，就视为已使用；因此动态访问不会造成误报错误，也可能漏掉一些未使用的键。
- 某个词典从未被引用。
- ICU 消息使用了普通的 `{placeholders}`，但无法解析为 ICU，或者某种语言缺少复数选项（例如俄语的 `few`）。
- 某个字符串仍然以 `[TODO]` 开头，由 `--fix` 或被拒绝的翻译留下。

引用检查和未使用键检查会扫描 `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`，并跳过 `node_modules`、构建输出、`*.d.ts`、生成的文件、配置文件以及词典本身。没有可扫描的源代码时，这些检查会被跳过。

## 选项

| 选项                  | 说明                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | 自定义配置路径                                                                                           |
| `--json`              | 输出机器可读的 JSON（`success`、`totalIssues`、`totalWarnings`、`fixed`、`diagnostics`），不输出其他内容 |
| `--github`            | 同时输出 GitHub Actions 注解（`::error file=...,line=...::message`）                                     |
| `--fix`               | 检查之前先插入缺失的键                                                                                   |
| `--src <globs...>`    | 要扫描的源文件 glob，用于替代默认值                                                                      |

## --fix

对于某个 locale 有而另一个 locale 缺少的每个键，`--fix` 会把默认 locale 的值复制到缺失的位置。字符串会加上 `[TODO] ` 前缀以便查找；函数则按原样复制。缺少的已配置 locale 会被创建。编辑是在语法树上进行的，因此注释和文件的其余部分都会保留。 它还会重写已过期的生成文件。

之后运行 [`dialex translate`](./translate.md)，用真实的翻译替换这些占位符。

## GitHub Actions

```yaml
- run: bunx dialex check --github
```

错误和警告会作为注解显示在它们所指向的文件和行上。
