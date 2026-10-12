# 环境要求

Dialex 对你的环境有哪些要求，以及需要你自己安装什么。

## 运行时与工具

| 要求       | Dialex 需要什么                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 模块格式   | 这些包**仅为 ES 模块**（`"type": "module"`，`.mjs` 文件）。请从 ESM、打包器，或在 CommonJS 中用 `import()` 导入                                                    |
| Node.js    | 没有声明 `engines` 字段。测试套件和 CI 在 Node.js 22 上运行；仓库自身的工具需要 22.18 或更高。请使用当前的 LTS 版本                                                |
| 其他运行时 | 运行时核心和 Fetch API 处理器只使用标准 API（`Intl`、`Request`、`Headers`、`Map`），因此只要这些存在就能运行：Bun、Deno、Cloudflare Workers 和浏览器               |
| TypeScript | 当前的 5.x 或更高版本。类型使用了模板字面量类型和条件类型。仓库使用 TypeScript 7 做类型检查                                                                        |
| 模块解析   | `compilerOptions.moduleResolution` 必须是 `"bundler"`、`"node16"` 或 `"nodenext"`。子路径导入（`dialexjs/react`）是 `exports` 条目，旧的 `"node"` 设置不会读取它们 |
| 包管理器   | npm、Yarn、pnpm 和 Bun 都可以。原生 CLI 二进制作为可选依赖安装，所以想用它就不要使用 `--no-optional`（见[原生二进制](./native.md)）                                |

## 包

| 包                          | 是什么                             | 依赖                          |
| --------------------------- | ---------------------------------- | ----------------------------- |
| `dialexjs`                  | 运行时和每个框架适配器             | 无。框架是可选的 peer 依赖    |
| `@dialexjs/cli`             | `dialex` / `dx`。作为开发依赖安装  | 自带所需工具；需要 `dialexjs` |
| `@dialexjs/language-server` | 面向 Zed 和其他编辑器的 LSP 服务器 | `@dialexjs/cli`               |
| `@dialexjs/mcp`             | 面向 AI 助手的 MCP 服务器          | `@dialexjs/cli`               |

## 框架版本

框架是 `dialexjs` 的**可选 peer 依赖**：只安装你用到的。适配器声明的版本如下：

| 适配器                                                    | Peer 依赖                        | 范围                  |
| --------------------------------------------------------- | -------------------------------- | --------------------- |
| `dialexjs/react`、`react-native`、`next/*`（配合 `next`） | `react`                          | `>=19.0.0`            |
| `dialexjs/next/middleware`、`next/link`                   | `next`                           | `>=13.0.0`            |
| `dialexjs/preact`                                         | `preact`                         | `>=10.0.0`            |
| `dialexjs/solid`                                          | `solid-js`                       | `^1.8.0`              |
| `dialexjs/vue`                                            | `vue`                            | `^3.4.0`              |
| `dialexjs/nuxt`                                           | `@nuxt/kit`                      | `>=3.0.0`             |
| `dialexjs/svelte`                                         | `svelte`                         | `^4.0.0 \|\| ^5.0.0`  |
| `dialexjs/qwik`                                           | `@builder.io/qwik`               | `>=1.5.0 <2`          |
| `dialexjs/lit`                                            | `lit`                            | `^3.0.0`              |
| `dialexjs/angular`                                        | `@angular/core`、`rxjs`          | `>=17.0.0`、`>=7.0.0` |
| `dialexjs/express`                                        | `express`                        | `>=4.0.0`             |
| `dialexjs/fastify`                                        | `fastify`                        | `>=4.0.0`             |
| `dialexjs/koa`                                            | `koa`                            | `>=2.0.0`             |
| `dialexjs/hono`                                           | `hono`                           | `>=3.0.0`             |
| `dialexjs/elysia`                                         | `elysia`                         | `>=1.0.0`             |
| `dialexjs/nestjs`                                         | `@nestjs/common`、`@nestjs/core` | `>=10.0.0`            |
| `dialexjs/hapi`                                           | `@hapi/hapi`                     | `>=21.0.0`            |
| `dialexjs/adonis`                                         | `@adonisjs/http-server`          | `>=7.0.0`             |
| `dialexjs/h3`                                             | `h3`                             | `>=1.8.0 <2`          |
| `dialexjs/astro`                                          | `astro`                          | `>=4.0.0`             |

`dialexjs/sveltekit`、`dialexjs/trpc`、`dialexjs/web`、`dialexjs/routing`、`dialexjs/icu`、`dialexjs/server` 和 `dialexjs/testing` 不需要框架包：它们使用结构类型或标准 `Request`。React Native 使用 `react`；Expo 的 `expo-localization` 和 AsyncStorage 是由你传入的，不是 peer 依赖。

## 编辑器

| 编辑器                | 你需要什么                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| VS Code               | Dialex 扩展（每个 GitHub 发布版本都附带一个 `.vsix`）。见 [VS Code](./vscode.md)                     |
| Zed                   | Dialex 扩展；它会启动 `@dialexjs/language-server`，后者需要 Node.js。见 [Zed 与其他编辑器](./zed.md) |
| 任何支持 LSP 的编辑器 | 用 `--stdio` 启动的 `@dialexjs/language-server`                                                      |

## 检查你的设置

```bash
node --version            # a current LTS
npx dialex --version      # the CLI, once installed
npx dialex check          # parity, ICU, references and a stale generated file
```
