# API 参考

Dialex 导出的全部内容，按入口点划分。每个入口点都是 `dialexjs` 包的子路径（`import { DialexProvider } from "dialexjs/react"`）；CLI 的编程 API 是 `@dialexjs/cli/api`。包根只导出 [Core](./core.md) 列出的内容，因此框架适配器只有在你导入时才会被加载。

## 入口点

| 入口点                                                                                   | 提供的内容                                           | 参考                                                             |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `dialexjs`                                                                               | 配置、词典、`createT`、格式化辅助函数、ICU 与类型    | [Core](./core.md)、[格式化](./formatting.md)、[类型](./types.md) |
| `dialexjs/icu`                                                                           | 不含其余运行时的 ICU 消息解析器与格式化器            | [ICU 消息](./icu.md)                                             |
| `dialexjs/server`                                                                        | 用于服务端代码的 `getDictionary` 与 `getT`           | [服务端适配器](./server-adapters.md#dialexjs-server)             |
| `dialexjs/express`、`fastify`、`koa`、`hono`、`elysia`、`h3`、`hapi`、`adonis`、`nestjs` | 请求中间件、插件与模块                               | [服务端适配器](./server-adapters.md)                             |
| `dialexjs/sveltekit`、`astro`、`trpc`、`web`                                             | 钩子、中间件、上下文与 Fetch API 处理器              | [服务端适配器](./server-adapters.md)                             |
| `dialexjs/react`、`preact`、`solid`、`vue`、`nuxt`、`svelte`、`qwik`、`lit`、`angular`   | 客户端框架的 Provider、Hook 与 Store                 | [客户端框架](./client-frameworks.md)                             |
| `dialexjs/react-native`                                                                  | 带设备语言与存储的 `DialexProvider`                  | [客户端框架](./client-frameworks.md#dialexjs-react-native)       |
| `dialexjs/next/middleware`、`dialexjs/next/link`                                         | Next.js 中间件与 `DialexLink`                        | [客户端框架](./client-frameworks.md#next-js)                     |
| `dialexjs/routing`                                                                       | 带 locale 前缀的路径、`hreflang` 链接与 sitemap 条目 | [路由](./routing.md)                                             |
| `dialexjs/testing`、`dialexjs/testing/react`、`dialexjs/testing/vue`                     | 测试上下文、模拟请求与测试 Provider                  | [测试](./testing.md)                                             |
| `@dialexjs/cli/api`                                                                      | 项目分析与词典编辑辅助函数                           | [CLI API](./cli-api.md)                                          |

## 约定

- **带类型的名称与路径。** `DictionaryRegistry`、`Register` 和 `MessageArguments` 是空接口，`dialex generate` 会在 `dialex-env.d.ts` 中扩充它们。在它运行之前，词典名称和 `t()` 路径只是普通的 `string`；运行之后它们可以自动补全并受到检查。参见[类型](./types.md)。
- **生成的 `dialex` 对象。** Provider、适配器和 `createDialexServer` 接受 `dialex.generated.ts` 中的 `{ ...dialex }`。它携带词典、可安全用于客户端的配置，以及懒加载时的 loader，因此 locale 设置只需在 `dialex.config.ts` 中写一次。
- **失败情形。** 缺少词典、locale 或路径时，生产代码绝不会抛出异常：它会以 `[dialex]` 前缀调用 `console.warn`，并返回空对象或路径本身。无效的 ICU 消息会由 `t()` 报告并原样返回；`formatMessage` 会抛出异常。需要 Provider 的 Hook 在缺少 Provider 时会抛出异常。
- **稳定性。** Dialex 尚未到 1.0。不兼容的更改会随次版本发布，并列在[更新日志](../guide/changelog.md)中。
