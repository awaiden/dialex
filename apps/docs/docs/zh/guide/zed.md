# Zed 与其他编辑器

Dialex 有一个语言服务器 [`@dialexjs/language-server`](https://www.npmjs.com/package/@dialexjs/language-server)，使用 Language Server Protocol。支持它的编辑器无需专门的插件，就能获得 Dialex 的诊断、悬停提示、转到定义、自动补全和快速修复。Zed 有一个负责查找并启动它的扩展。VS Code 扩展见 [VS Code 扩展](./vscode.md)。

::: warning 状态
语言服务器已针对 LSP 客户端测试，Zed 扩展可以构建，但**尚未在真实的 Zed 窗口中试用过**，也不在 Zed 的扩展注册表中。请作为开发扩展安装，并反馈任何看起来不对的地方。
:::

## Zed

从仓库安装扩展（位于 `packages/zed`）：在 Zed 的命令面板中运行 **zed: install dev extension** 并选择该文件夹。需要带 `wasm32-wasip2` 目标的 Rust。

扩展先在你的项目中查找服务器（`package.json` 中的 `@dialexjs/language-server`），再在 `PATH` 中查找，否则用 npm 安装并更新自己的副本。它只会在有 `dialex.config.*` 文件或 `package.json` 中有 `dialexjs` 的项目里启动。

设置写在 Zed 设置的 `lsp.dialex` 下：

```json
{
  "lsp": {
    "dialex": {
      "settings": {
        "unusedKeys": false,
        "autoGenerate": true,
        "configPath": ""
      }
    }
  }
}
```

如果服务器没有为 TypeScript 文件启动，请把它加入该语言的服务器列表：

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## 其他编辑器

任何 LSP 客户端都可以通过 stdio 运行该服务器：

```bash
npx @dialexjs/language-server --stdio
```

Neovim 0.11 或更新版本：

```lua
vim.lsp.config("dialex", {
  cmd = { "npx", "@dialexjs/language-server", "--stdio" },
  filetypes = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  root_markers = { "dialex.config.ts", "package.json" },
})
vim.lsp.enable("dialex")
```

Helix，在 `languages.toml` 中：

```toml
[language-server.dialex]
command = "npx"
args = ["@dialexjs/language-server", "--stdio"]

[[language]]
name = "typescript"
language-servers = ["typescript-language-server", "dialex"]
```

::: warning 未测试的配置
这两段配置遵循各编辑器文档中的写法，但没有在真实的编辑器中运行过。请对照你所用版本的文档检查。
:::

## 功能

服务器提供：

| 功能       | 你得到什么                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 诊断       | 缺失的键和语言、无效的 [ICU](./icu.md)、`[TODO]` 占位符、已过期的翻译，以及指向不存在内容的 `getDictionary("x")` 或 `t("x.y")` 调用 |
| 悬停提示   | 一个键在每种语言中的文本                                                                                                            |
| 转到定义   | 跳转到词典写下该键的位置                                                                                                            |
| 自动补全   | `t("...")` 和 `getDictionary("...")` 中的词典名称和键路径                                                                           |
| 快速修复   | 把缺失的键复制到某个语言（标记为 `[TODO]`）、添加所有缺失的键，或创建代码引用的键                                                   |
| 生成的文件 | 在已有生成文件的项目中，词典或配置文件变化时重新生成 `dialex.generated.ts`                                                          |

## 设置

服务器从编辑器配置的 `dialex` 部分读取这些设置：

| 设置           | 默认值  | 说明                                                         |
| -------------- | ------- | ------------------------------------------------------------ |
| `enable`       | `true`  | 关闭所有功能                                                 |
| `unusedKeys`   | `false` | 淡化没有任何源文件似乎在使用的键和词典                       |
| `autoGenerate` | `true`  | 词典或配置变化时重新生成 `dialex.generated.ts`               |
| `configPath`   | —       | 相对于每个项目根目录的配置文件；留空则使用 `dialex.config.*` |

## 限制

- 词典和配置从语法树读取，因此服务器永远不会运行你项目的代码。用展开（spread）或计算键构建的词典无法分析，会显示一条提示；请对它们运行 `dialex check`。
- 生成的文件只会在已经有生成文件的项目中更新。运行一次 `dialex generate` 来创建它。
- 没有编辑器命令：重新生成是自动的。
