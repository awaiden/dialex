# CLI

`@dialexjs/cli` 会安装两个可执行命令：`dialex` 和更短的别名 `dx`，适合用在 `package.json` 脚本中（`"dx:generate": "dx generate"`）。

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| 命令                                 | 别名   | 用途                                              |
| ------------------------------------ | ------ | ------------------------------------------------- |
| [`dialex init`](./init.md)           |        | 在项目中初始化 Dialex                             |
| [`dialex generate`](./generate.md)   | `gen`  | 编译词典和类型声明                                |
| [`dialex check`](./check.md)         | `lint` | 检查 locale 一致性以及代码如何使用词典            |
| [`dialex export`](./export.md)       |        | 把字符串导出为 JSON、CSV 或 XLIFF，供翻译人员使用 |
| [`dialex import`](./import.md)       |        | 把翻译好的文件写回词典                            |
| [`dialex translate`](./translate.md) |        | 使用机器翻译提供者补全缺失的翻译                  |
| [`dialex lock`](./lock.md)           |        | 把翻译记录为与源文本一致                          |

典型的工作流程：先用 `dialex check --fix` 为新键创建占位符，然后使用 `dialex translate`，或使用 `dialex export` / `dialex import` 交给人工翻译，最后在 CI 中运行 `dialex check`。

## 退出码与 JSON

| 命令                                              | 退出码                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `generate`、`export`、`translate`、`lock`、`init` | 成功为 `0`，命令失败时为 `1`（语法错误、未知格式、没有 provider……）          |
| `check`                                           | 发现错误时为 `1`；警告从不导致失败（`--fail-on-stale` 会把过期翻译变为错误） |
| `import`                                          | 无法运行时为 `1`。即使拒绝了某些值也以 `0` 退出；请读取 JSON 中的 `success`  |

`generate`、`check`、`export`、`import`、`translate` 和 `lock` 接受 `--json`：它们只打印一个 JSON 对象，别无其他，便于其他程序读取。结构见各命令的页面；对于 `check`，另见[诊断参考](../guide/diagnostics.md)。
