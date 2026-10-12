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

## 原生二进制

在 Linux、macOS 和 Windows（x64 与 arm64）上，`dialex` 和 `dx` 运行用 Rust 构建的原生二进制文件，它作为可选依赖（`@dialexjs/cli-<platform>`）随包一起安装。在包含 1,000 个字典的项目中，`generate` 和 `check` 比 Node 实现快 25 到 40 倍，并且生成的文件和输出逐字节一致。

原生二进制从语法树读取字典和配置。当命令需要运行项目代码（不是纯数据的配置、`translate` 提供方、`runtime: true`、懒加载、`--fix`、`--watch`），或没有原生实现（`init`、`export`、`import`、`lock`、`translate`）时，它会把整个命令交给 Node CLI，因此对你来说没有任何变化。两个环境变量可以控制这一行为：

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # native only: fail instead of falling back to Node
```

在 Linux 和 macOS 上使用 npm 和 Yarn classic 时，安装步骤会把二进制文件放到启动器原来的位置，因此 `dx` 无需先启动 Node（约 25 毫秒），不到一毫秒就能启动。其他包管理器、`--ignore-scripts` 和 Windows 会保留一个运行同一二进制文件的小型 JavaScript 启动器。
