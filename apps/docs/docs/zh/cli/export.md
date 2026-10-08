# dialex export

把词典中的字符串写入翻译人员可以处理的文件，无需改动 TypeScript。

```bash
dialex export                      # JSON, into ./i18n-export
dialex export -f csv
dialex export -f xliff -o translations
dialex export -l tr de
```

| 选项                        | 说明                                   |
| --------------------------- | -------------------------------------- |
| `-f, --format <format>`     | `json`（默认）、`csv` 或 `xliff`       |
| `-o, --out <dir>`           | 输出目录（默认 `i18n-export`）         |
| `-l, --locale <locales...>` | 仅限这些 locale（始终包含默认 locale） |
| `-c, --config <path>`       | 自定义配置路径                         |

## 格式

键是以词典名称为前缀的点分路径，例如 `home.nav.about`。

- **JSON**：每个 locale 一个扁平文件，`en.json`、`tr.json` 等，内容形如 `{ "home.title": "Welcome" }`。
- **CSV**：一个 `translations.csv`，包含一列 `key`，以及每个 locale 一列。空单元格表示缺失的翻译。
- **XLIFF 1.2**：每个非默认 locale 一个 `<locale>.xlf`，默认 locale 的文本作为 `<source>`，该 locale 的文本作为 `<target>`。缺失的翻译没有 `<target>`。

只会导出普通字符串值。函数值（例如 `(name) => \`Hello ${name}\``）无法作为文本翻译，会被统计并报告为已跳过。键本身的名称中不能包含点号。

使用 [`dialex import`](./import.md) 把翻译导回。
