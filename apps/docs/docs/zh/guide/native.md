# 原生二进制

`dialex generate`、`dialex check` 和语言服务器有用 Rust 编写的原生实现。它从语法树读取同样的词典和配置，并生成**逐字节相同的文件和输出**；只是更快。其他所有命令，以及原生代码无法独自判断的任何情形，都会像以前一样在 Node CLI 中运行。你不需要做选择：安装 `@dialexjs/cli`，正确的事情就会发生。

## 速度

在一台机器（Intel Core i5-11400H）上，取全新进程 5 次中的最佳值测得；你的数字会有所不同，请运行 `apps/benchmarks/cli/run.mjs` 在自己的硬件上比较。

| 项目         | 命令       | Node CLI | 原生二进制 |
| ------------ | ---------- | -------: | ---------: |
| 100 个词典   | `generate` |   341 ms |     4.3 ms |
| 100 个词典   | `check`    |   492 ms |     8.9 ms |
| 1,000 个词典 | `generate` | 1,107 ms |      28 ms |
| 1,000 个词典 | `check`    | 2,149 ms |      88 ms |

语言服务器分析 1,000 个词典约需 50 毫秒，而不是约 2.7 秒，编辑一次后的重新分析约需 20 毫秒。

## 支持哪些平台

预编译的二进制作为 `@dialexjs/cli` 的可选依赖发布：

| 平台                        | 包                                                       |
| --------------------------- | -------------------------------------------------------- |
| Linux x64 和 arm64（glibc） | `@dialexjs/cli-linux-x64`、`@dialexjs/cli-linux-arm64`   |
| macOS Intel 和 Apple 芯片   | `@dialexjs/cli-darwin-x64`、`@dialexjs/cli-darwin-arm64` |
| Windows x64 和 arm64        | `@dialexjs/cli-win32-x64`、`@dialexjs/cli-win32-arm64`   |

Alpine Linux（musl）和其他平台没有二进制，使用 Node CLI。使用 `--no-optional` 的安装也一样。

## 如何选择

`dx` 是一个小型启动器。如果安装了该平台的包，它就运行二进制；否则运行 Node CLI。在 Linux 和 macOS 上使用 npm 和 Yarn classic 时，安装步骤会更进一步，把二进制放到启动器原来的位置，这样 `dx` 无需先启动 Node 就能启动（不到 1 毫秒，而不是约 25 毫秒）。使用 `--ignore-scripts`、pnpm、Bun（默认阻止生命周期脚本）或 Windows 时，启动器会保留，并运行同一个二进制。

## 哪些命令是原生运行的

| 命令                                            | 原生                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `dialex generate`                               | 是，适用于 eager（非懒加载）项目，支持 `-o`、`-c` 和 `--json`     |
| `dialex check`                                  | 是，支持 `-c`、`--json`、`--github`、`--fail-on-stale` 和 `--src` |
| `--version`                                     | 是                                                                |
| 语言服务器                                      | 是，通过 `DIALEX_NATIVE=1` 选择启用（见下文）                     |
| `init`、`export`、`import`、`lock`、`translate` | 否：Node CLI                                                      |
| `generate --watch`、`check --fix`、`lazy` 加载  | 否：Node CLI                                                      |

当原生代码遇到它不该猜测的内容时，命令同样会在 Node 中运行：

- 带有展开、计算键或非字面量值的 `dialex.config.*`（Node CLI 会执行该文件）；
- 带有展开、计算键、导入值或计算名称的词典；
- 它无法精确解释的 glob 或 locale 标签。

结果始终与没有原生二进制时相同，只是不会更快。

## 环境变量

| 变量                                                | 使用者                      | 作用                                                                                                                                                               |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DIALEX_NATIVE=0`                                   | CLI、语言服务器             | 始终使用 Node 实现                                                                                                                                                 |
| `DIALEX_NATIVE=1`                                   | CLI                         | 当 `generate` 或 `check` 无法原生完成时，以退出码 1 和原因退出，而不是在 Node 中运行。适合在 CI 中发现悄悄失去加速效果的词典。只属于 Node 的命令照常在 Node 中运行 |
| `DIALEX_NATIVE=1`                                   | 语言服务器                  | 运行原生服务器。缺省时运行 Node 服务器                                                                                                                             |
| `DIALEX_BINARY=/path/to/dx`                         | CLI 启动器                  | 使用这个二进制，而不是已安装的平台包                                                                                                                               |
| `DIALEX_LSP_BINARY=/path/to/dialex-language-server` | `@dialexjs/language-server` | 使用这个服务器二进制                                                                                                                                               |
| `DIALEX_NODE_CLI=/path/to/index.mjs`                | 原生二进制                  | 命令要交给的 Node CLI。由启动器设置；只有单独运行二进制时才需要自己设置                                                                                            |
| `DIALEX_SKIP_NATIVE_INSTALL=1`                      | 安装步骤                    | 保留 JavaScript 启动器，不用二进制替换它                                                                                                                           |
| `NO_COLOR`                                          | CLI                         | 不带颜色输出                                                                                                                                                       |

## 使用原生语言服务器

语言服务器目前需要主动启用。在启动它的环境中设置 `DIALEX_NATIVE=1`；`@dialexjs/language-server` 随后会运行平台包中的二进制。在 Zed 中，你也可以把 `lsp.dialex.binary.path` 设为该二进制。它提供与 Node 服务器相同的诊断、悬停、转到定义、补全和快速修复。对于使用懒加载的项目，它不会重新生成 `dialex.generated.ts`；请对这些项目运行 `dialex generate`。

## 查看运行的是哪一个

`dialex --version` 在两种情况下输出同样的版本号。要查看某个命令是否原生完成，请带 `DIALEX_NATIVE=1` 运行它：如果它输出正常结果，就是原生运行的；如果它以 `dialex: native check declined: ...` 退出，原因就在消息里，而没有这个变量时它会在 Node 中运行。
