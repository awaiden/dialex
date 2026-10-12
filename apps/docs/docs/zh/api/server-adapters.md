# 服务端适配器

每个服务端适配器都会解析请求的 locale，然后把 `locale` 和 `getDictionary(name)`（在框架允许时还有 `t`）添加到请求上。它们共用一套选项和同一种检测顺序。带完整示例的指南在[框架页面](../frameworks/README.md)；locale 如何选定见 [Locale 检测](../guide/locale-detection.md)。

所有适配器都接受生成的对象：`dialexExpress({ ...dialex })`。

## 选项

每个适配器都接受 locale 检测选项，并且除 Next.js 的 `createDialexMiddleware` 和 NestJS 模块外，还接受基础适配器选项。

### Locale 检测选项（`LocaleResolverOptions`）

| 选项            | 类型                                   | 默认值               | 说明                                                                                               |
| --------------- | -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `config`        | `GeneratedConfig`                      | —                    | 生成的 `config`。`{ ...dialex }` 会设置它。下面的 `defaultLocale`、`locales`、`fallbacks` 会覆盖它 |
| `defaultLocale` | `string`                               | `"en"`               | 没有任何匹配时使用的 locale                                                                        |
| `locales`       | `string[]`                             | —                    | 支持的 locale。缺省时会忽略路径前缀，并接受任何候选值                                              |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | 查询参数名                                                                                         |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie 名                                                                                          |
| `headerKey`     | `string`                               | `"Accept-Language"`  | 要读取的请求头                                                                                     |
| `usePath`       | `boolean`                              | `true`               | 检查 URL 路径的第一段（`/tr/...`）                                                                 |
| `custom`        | `(req) => string \| null \| undefined` | —                    | 自定义提取函数，最先尝试。`req` 是框架的请求对象                                                   |
| `fallbacks`     | `Record<string, string[]>`             | —                    | 显式的[回退链](../guide/fallbacks.md)                                                              |

### 基础适配器选项（`BaseAdapterOptions`）

| 选项           | 类型              | 默认值 | 说明                                                                                                                       |
| -------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries` | `DictionaryInput` | —      | `{ name: { locale: content } }` 映射，或 `defineDictionary` 结果的数组。缺省时只能找到已通过 `defineDictionary` 注册的词典 |
| `setHeader`    | `boolean`         | `true` | 把解析出的 locale 作为 `Content-Language` 发送                                                                             |

## 每个适配器添加的内容

| 适配器                  | 导入                 | 注册方式                                             | 请求上会得到                                           |
| ----------------------- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| [Express](#express)     | `dialexjs/express`   | `app.use(dialexExpress(options))`                    | `req.locale`、`req.getDictionary`，`res.locals` 上相同 |
| [Fastify](#fastify)     | `dialexjs/fastify`   | `app.register(dialexPlugin, options)`                | `request.locale`、`request.getDictionary`              |
| [Koa](#koa)             | `dialexjs/koa`       | `app.use(dialexKoa(options))`                        | `ctx.locale`、`ctx.getDictionary`                      |
| [Hono](#hono)           | `dialexjs/hono`      | `app.use("*", dialexHono(options))`                  | `c.var.locale`、`c.var.getDictionary`                  |
| [Elysia](#elysia)       | `dialexjs/elysia`    | `app.use(dialexElysia(options))`                     | 上下文中的 `locale`、`getDictionary`、`t`              |
| [h3](#h3)               | `dialexjs/h3`        | Nitro 中间件文件的默认导出                           | `event.context.locale`、`.getDictionary`、`.t`         |
| [Hapi](#hapi)           | `dialexjs/hapi`      | `server.register({ plugin: dialexPlugin, options })` | `request.locale`、`request.getDictionary`              |
| [AdonisJS](#adonisjs)   | `dialexjs/adonis`    | `router.use([() => import("#middleware/dialex")])`   | `ctx.locale`、`ctx.getDictionary`                      |
| [NestJS](#nestjs)       | `dialexjs/nestjs`    | `DialexModule.forRoot(options)`                      | `req.locale`、`req.getDictionary`、装饰器              |
| [SvelteKit](#sveltekit) | `dialexjs/sveltekit` | `export const handle = dialexHandle(options)`        | `event.locals.locale`、`.getDictionary`、`.t`          |
| [Astro](#astro)         | `dialexjs/astro`     | `export const onRequest = dialexAstro(options)`      | `Astro.locals.locale`、`.getDictionary`、`.t`          |
| [tRPC](#trpc)           | `dialexjs/trpc`      | 展开到 `createContext` 中                            | `ctx.locale`、`ctx.getDictionary`、`ctx.t`             |
| [Fetch API](#fetch-api) | `dialexjs/web`       | `createDialexHandler(options)(request)`              | `locale`、`getDictionary`、`t`、`headers`              |

## Express

```ts
import { dialexExpress } from "dialexjs/express";

function dialex(options?: ExpressDialexOptions): RequestHandler; // also exported as dialexExpress
```

在你的路由之前注册。安装了 `cookie-parser` 时从 `req.cookies` 读取 Cookie，否则从 `Cookie` 请求头读取。选项：`ExpressDialexOptions`（locale 检测选项、`dictionaries`、`setHeader`）。

## Fastify

```ts
import dialexPlugin from "dialexjs/fastify";

const dialexPlugin: FastifyPluginAsync<FastifyDialexOptions>; // default export and named export
```

需要 Fastify 4 或更高版本。选项：`FastifyDialexOptions`。

## Koa

```ts
import { dialexKoa } from "dialexjs/koa";

function dialex(options?: KoaDialexOptions): Middleware; // also the default export and dialexKoa
```

选项：`KoaDialexOptions`。

## Hono

```ts
import { dialexHono } from "dialexjs/hono";

function dialex(options?: HonoDialexOptions): MiddlewareHandler; // also exported as dialexHono
```

用 `c.var.locale` 和 `c.var.getDictionary("home")` 读取这些值。选项：`HonoDialexOptions`。

## Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";

function dialex(options?: ElysiaDialexOptions): Elysia; // also the default export and dialexElysia
```

通过 `derive` 添加 `locale`、`getDictionary` 和 `t`，因此在每个处理器中都有类型。选项：`ElysiaDialexOptions`（即 `BaseAdapterOptions`）。

## h3

```ts
import { dialexH3 } from "dialexjs/h3";

function dialex(options?: H3DialexOptions): EventHandler; // also the default export and dialexH3
```

适用于 h3 1.x（Nitro 2 以及 Nuxt 3 和 4 的服务端路由）。选项：`H3DialexOptions`。

## Hapi

```ts
import { dialexHapi } from "dialexjs/hapi";

const dialexPlugin: Plugin<HapiDialexOptions>; // also the default export and dialexHapi
```

选项：`HapiDialexOptions`。在 `onRequest` 中装饰请求。

## AdonisJS

```ts
import { createDialexMiddleware } from "dialexjs/adonis";

function createDialexMiddleware(options?: AdonisDialexOptions): MiddlewareClass; // also default and dialexAdonis
```

返回适用于 AdonisJS 6 及更高版本的中间件**类**；把它作为 `app/middleware` 中某个文件的默认导出。选项：`AdonisDialexOptions`。

## NestJS

```ts
import { DialexModule } from "dialexjs/nestjs";
```

| 导出                                 | 说明                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot(options?)`     | 动态模块。`NestDialexOptions` 在 locale 检测选项和 `dictionaries` 之外增加 `isGlobal`（默认 `true`）        |
| `DialexModule.forRootAsync(options)` | 在 `useFactory` 中构建选项，可使用 `imports` 和 `inject`。`NestDialexAsyncOptions`                          |
| `DialexService`                      | 可注入：`getDefaultLocale()`、`getSupportedLocales()`、`resolveLocale(req)`、`getDictionary(name, locale?)` |
| `DialexMiddleware`                   | 设置 `req.locale`、`req.getDictionary` 和 `Content-Language` 响应头                                         |
| `DialexInterceptor`                  | 同样的功能，以拦截器形式提供                                                                                |
| `@DialexLocale()`                    | 参数装饰器：解析出的 locale                                                                                 |
| `@DialexDictionary(name)`            | 参数装饰器：解析出的 locale 对应的词典                                                                      |
| `DIALEX_OPTIONS`                     | 选项的注入令牌                                                                                              |

## SvelteKit

```ts
import { dialexHandle, LANG_PLACEHOLDER } from "dialexjs/sveltekit";

function dialexHandle(options?: SvelteKitDialexOptions): Handle; // also the default export
const LANG_PLACEHOLDER: "%dialex.lang%";
```

设置 `event.locals.locale`、`getDictionary` 和 `t`，并把渲染后 HTML 中的 `%dialex.lang%` 替换为 locale，这样 `src/app.html` 中的 `<html lang="%dialex.lang%">` 就是正确的。`Handle` 是本地的结构类型，可与 SvelteKit 2 和 3 配合使用。

## Astro

```ts
import { dialexAstro } from "dialexjs/astro";

function dialex(options?: AstroDialexOptions): MiddlewareHandler; // also the default export and dialexAstro
```

在 `src/middleware.ts` 中把它导出为 `onRequest`。选项：`AstroDialexOptions`。

## tRPC

```ts
import { createDialexContext } from "dialexjs/trpc";

function createDialexContext(
  options?: TrpcDialexOptions,
): (request: TrpcRequestLike) => TrpcDialexContext; // also default and dialexTrpc
```

`TrpcRequestLike` 是 Fetch 的 `Request`，或带有 `headers` 和可选 `url` 的对象，这正是 fetch、Next.js、Express 和 standalone 适配器传给 `createContext` 的内容。结果 `{ locale, getDictionary, t }` 应放进你的上下文。

## Fetch API

```ts
import createDialexHandler from "dialexjs/web";

function createDialexHandler(options?: WebDialexOptions): (request: Request) => Promise<WebDialex>;
```

适用于任何带标准 `Request` 的运行时（React Router 和 Remix 的 loader、TanStack Start、SolidStart、Cloudflare Workers、Deno、Bun）。`WebDialex` 包含 `locale`、`getDictionary`、`t`、`headers`（`{ "Content-Language": ... }`，`setHeader` 为 `false` 时为空）和 `applyHeaders(response)`。

## `dialexjs/server`

```ts
import { createDialexServer } from "dialexjs/server";

function createDialexServer(source: DialexSource): DialexServer;

interface DialexServer {
  getDictionary<K extends DictionaryKey>(name: K, locale?: Locales): ResolveDictionaryType<K>;
  getT(locale?: Locales): Translate;
}
```

用于不绑定请求的代码：Next.js Server Component、脚本、任务。用生成的对象创建一次：

```ts
// src/dialex.ts
import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

`locale` 默认是已配置的默认 locale，没有内容的 locale 会沿[回退链](../guide/fallbacks.md)回退。它需要 eager 的生成文件：使用 `lazy` 加载时请用客户端入口点。
