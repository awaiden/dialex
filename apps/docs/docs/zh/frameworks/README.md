# 框架

Dialex 为每个框架提供一个适配器，作为 `dialexjs` 的子路径导出。

| 框架                        | 导入                                                                                 | 入口                                                            |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `i18n()` 中间件                                                 |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `i18n()` 中间件                                                 |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `i18n()` 中间件                                                 |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `I18nModule`、装饰器                                            |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `i18n()` 插件                                                   |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `i18nHandle()` 钩子                                             |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `i18n()` 中间件                                                 |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createI18n`, `useI18n`, `useDictionary`, Nuxt 模块             |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `i18n()` 中间件（h3 1.x）                                       |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | 适用于任意 `Request` 的 `createI18nHandler()`                   |

服务端适配器（Express、Fastify、Koa、Hono、NestJS、Elysia、SvelteKit、Astro、h3）的行为都相同：它们解析 locale（[参见检测](../guide/locale-detection.md)），并在请求上暴露 `locale` 和 `getDictionary(name)`。把 `dialex generate` 的输出作为 `dictionaries` 传入：

```ts
import dictionaries from "./src/i18n.generated.js";
```

各框架的包（`express`、`fastify`、`hono`、`koa`、`elysia`、`astro`、`h3`、`@angular/core`、`next`、`react`、`vue`、`@nuxt/kit`、`@nestjs/*`、`rxjs`、`vite`）都是可选的对等依赖；只安装你用到的即可。
