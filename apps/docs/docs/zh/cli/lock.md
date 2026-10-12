# dialex lock

把你现有的翻译记录为与当前源文本一致的最新状态，以便之后对源文本的修改能被发现。它会在配置文件旁写出 `dialex.lock.json`。

```bash
dialex lock                  # adopt the lock file; leave out-of-date translations alone
dialex lock --all            # also accept translations that are already out of date
dialex lock -s en --json
```

| 选项                    | 说明                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `-s, --source <locale>` | 翻译所依据的 locale。默认：`translate.sourceLocale`，然后是 `defaultLocale` |
| `--all`                 | 同时记录已经过期的翻译（按现状接受它们）                                    |
| `--json`                | 打印机器可读的 JSON                                                         |
| `-c, --config <path>`   | 自定义配置路径                                                              |

## 它做什么

对于源 locale 之外每个 locale 的每个字符串，它会保存同一个键在源 locale 中文本的简短哈希，除非：

- 该值仍以 `[TODO] ` 开头（尚未翻译）；
- 自记录以来源文本已变化，且没有给出 `--all`（它已过期，因此会被列出）；
- 该值是函数或其他非字符串值。

采用锁文件时运行一次，并在你审阅过 [`dialex check`](./check.md) 报告为过期的翻译之后再运行一次。[`dialex translate`](./translate.md) 和 [`dialex import`](./import.md) 会记录它们写入的内容，所以在它们之后不需要 `lock`。

如果锁文件是根据另一个源 locale 写出的，它对这个源 locale 没有任何说明，会重新开始一个新的锁。

## 输出

```json
{ "success": true, "sourceLocale": "en", "recorded": 5, "stale": [] }
```

| 字段           | 说明                                            |
| -------------- | ----------------------------------------------- |
| `success`      | 除非命令失败（例如配置无法读取），否则为 `true` |
| `sourceLocale` | 所用的源 locale                                 |
| `recorded`     | 新记录为最新状态的翻译数量                      |
| `stale`        | 仍然过期并被保持原样的键（仅在没有 `--all` 时） |

退出码为 `0`；命令无法运行时为 `1`。

## 文件

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

键是排序的，因此文件产生的 diff 小而稳定。请提交它，让整个团队看到相同的状态。没有记录的翻译（例如手写的翻译）永远不会被报告为过期。
