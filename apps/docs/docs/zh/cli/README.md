# CLI

`@dialexjs/cli` 会安装两个可执行命令：`dialex` 和更短的别名 `dx`，适合用在 `package.json` 脚本中（`"dx:generate": "dx generate"`）。

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| 命令                                                         | 别名   | 用途                                              |
| ------------------------------------------------------------ | ------ | ------------------------------------------------- |
| [`dialex init`](./init.md)                                   |        | 在项目中初始化 Dialex                             |
| [`dialex generate`](./generate.md)                           | `gen`  | 编译词典和类型声明                                |
| [`dialex check`](./check.md)                                 | `lint` | 检查 locale 一致性以及代码如何使用词典            |
| [`dialex export`](./export.md)                               |        | 把字符串导出为 JSON、CSV 或 XLIFF，供翻译人员使用 |
| [`dialex import`](./import.md)                               |        | 把翻译好的文件写回词典                            |
| [`dialex translate`](./translate.md)                         |        | 使用机器翻译提供者补全缺失的翻译                  |
| [`dialex lock`](./translate.md#keeping-translations-in-sync) |        | 把翻译记录为与源文本一致                          |

典型的工作流程：先用 `dialex check --fix` 为新键创建占位符，然后使用 `dialex translate`，或使用 `dialex export` / `dialex import` 交给人工翻译，最后在 CI 中运行 `dialex check`。
