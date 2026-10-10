# 框架

Dialex 为每个框架提供一个适配器，作为 `dialexjs` 的子路径导出。

| 框架                              | 导入                                                                | 入口                                                           |
| --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Next.js](./nextjs.md)            | `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `createDialexMiddleware`, `DialexLink`, `createDialexServer`   |
| [React / Vite](./react.md)        | `dialexjs/react`                                                    | `DialexProvider`, `useDialex`, `useDictionary`                 |
| [React Router](./react-router.md) | `dialexjs/web`, `dialexjs/react`                                    | `createDialexHandler()`, `DialexProvider`                      |
| [Express](./express.md)           | `dialexjs/express`                                                  | `dialexExpress()` 中间件                                       |
| [Fastify](./fastify.md)           | `dialexjs/fastify`                                                  | `dialexPlugin`                                                 |
| [Koa](./koa.md)                   | `dialexjs/koa`                                                      | `dialexKoa()` 中间件                                           |
| [Hono](./hono.md)                 | `dialexjs/hono`                                                     | `dialexHono()` 中间件                                          |
| [NestJS](./nestjs.md)             | `dialexjs/nestjs`                                                   | `DialexModule`、装饰器                                         |
| [Elysia](./elysia.md)             | `dialexjs/elysia`                                                   | `dialexElysia()` 插件                                          |
| [SvelteKit](./sveltekit.md)       | `dialexjs/sveltekit`                                                | `dialexHandle()` 钩子                                          |
| [Astro](./astro.md)               | `dialexjs/astro`                                                    | `dialexAstro()` 中间件                                         |
| [Vue / Nuxt](./vue.md)            | `dialexjs/vue`, `dialexjs/nuxt`                                     | `createDialex`, `useDialex`, `useDictionary`, Nuxt 模块        |
| [Svelte](./svelte.md)             | `dialexjs/svelte`                                                   | `provideDialex`, `useDialex`, `useDictionary`, `useT`          |
| [Solid](./solid.md)               | `dialexjs/solid`                                                    | `DialexProvider`, `useDialex`, `useDictionary`, `useT`         |
| [Angular](./angular.md)           | `dialexjs/angular`                                                  | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary` |
| [h3 / Nitro](./h3.md)             | `dialexjs/h3`                                                       | `dialexH3()` 中间件（h3 1.x）                                  |
| [Fetch API](./web.md)             | `dialexjs/web`                                                      | 适用于任意 `Request` 的 `createDialexHandler()`                |

服务端适配器（Express、Fastify、Koa、Hono、NestJS、Elysia、SvelteKit、Astro、h3）的行为都相同：它们解析 locale（[参见检测](../guide/locale-detection.md)），并在请求上暴露 `locale` 和 `getDictionary(name)`。把 `dialex generate` 输出的 `dialex` 对象展开传给适配器。它同时带有词典和语言配置（`defaultLocale`、`locales`、`fallbacks`），无需手写任何内容：

```ts
import { dialex } from "./src/dialex.generated.js";

app.use(dialexExpress({ ...dialex }));
```

各框架的包（`express`、`fastify`、`hono`、`koa`、`elysia`、`astro`、`h3`、`@angular/core`、`next`、`react`、`vue`、`@nuxt/kit`、`@nestjs/*`、`rxjs`、`vite`）都是可选的对等依赖；只安装你用到的即可。
