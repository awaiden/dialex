# dialex import

把文件中已翻译的字符串写回你的词典源文件。

```bash
dialex import dialex-export/tr.json
dialex import dialex-export/translations.csv
dialex import translations/tr.xlf
dialex import --locale tr strings.json
```

| 选项                    | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `-f, --format <format>` | `json`、`csv` 或 `xliff`（根据扩展名推断） |
| `-l, --locale <locale>` | 单一 locale 文件所用的 locale              |
| `--allow-new`           | 添加尚不存在于任何 locale 中的键           |
| `-c, --config <path>`   | 自定义配置路径                             |
| `--json`                | 只打印机器可读的 JSON，别无其他            |

## 如何确定 locale

- **JSON**：像 `tr.json` 这样的扁平文件，locale 取自文件名或 `--locale`。形如 `{ "tr": { "home.title": "..." } }` 的文件则自带 locale。
- **CSV**：表头行给出 locale 名称（`key,en,tr`）。空单元格会被忽略。
- **XLIFF**：`target-language` 属性，或 `--locale`。

## 行为

- 现有字符串会被更新，缺失的会被添加到词典文件中，使用与 `check --fix` 相同的语法树编辑方式。
- 不存在于任何 locale 中的键会被忽略并列出，除非你传入 `--allow-new`。这可以防止拼写错误和过期的导出文件。
- 函数值永远不会被覆盖；它们会被报告为保持不变。
- 空值会被跳过。
- [ICU](../guide/icu.md) 消息会被验证：无效 ICU 的值，或与其他 locale 中同一个键使用了不同参数的值，会被拒绝并列出。

## 输出与退出码

使用 `--json` 时打印一个对象：

```json
{
  "success": false,
  "created": 0,
  "updated": 8,
  "skipped": [],
  "rejected": ["tr:a.items (invalid ICU: ...)"],
  "unknown": [],
  "errors": []
}
```

| 字段       | 说明                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `success`  | 至少有一个值被拒绝时为 `false`                                                   |
| `created`  | 新增的值                                                                         |
| `updated`  | 修改的值                                                                         |
| `skipped`  | 保持不变的函数或其他非文本值                                                     |
| `rejected` | 被拒绝的值，格式为 `locale:key (原因)`：无效的 ICU，或参数与另一个 locale 不一致 |
| `unknown`  | 在任何 locale 中都不存在而被忽略的键（用 `--allow-new` 添加）                    |
| `errors`   | 读取文件时的问题                                                                 |

命令无法运行时（文件缺失、格式未知）退出码为 `1`。**拒绝了某些值的运行仍然以 `0` 退出**：当脚本需要在出现被拒绝的值时停止，请检查 JSON 中的 `success` 或 `rejected`。
