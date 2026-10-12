# Server adapters

Every server adapter resolves the request's locale, then adds `locale` and `getDictionary(name)` (and, where the framework allows, `t`) to the request. They share one set of options and one detection order. Guides with complete examples are on the [framework pages](../frameworks/README.md); how a locale is chosen is on [Locale Detection](../guide/locale-detection.md).

All adapters accept the generated object: `dialexExpress({ ...dialex })`.

## Options

Every adapter takes the locale detection options and, except `createDialexMiddleware` of Next.js and the NestJS module, the base adapter options.

### Locale detection options (`LocaleResolverOptions`)

| Option          | Type                                   | Default              | Description                                                                                                   |
| --------------- | -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `config`        | `GeneratedConfig`                      | —                    | The generated `config`. `{ ...dialex }` sets it. `defaultLocale`, `locales` and `fallbacks` below override it |
| `defaultLocale` | `string`                               | `"en"`               | Locale used when nothing matches                                                                              |
| `locales`       | `string[]`                             | —                    | Supported locales. Without it a path prefix is ignored and any candidate is accepted                          |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Query parameter names                                                                                         |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie names                                                                                                  |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Header to read                                                                                                |
| `usePath`       | `boolean`                              | `true`               | Check the first URL path segment (`/tr/...`)                                                                  |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Custom extractor, tried first. `req` is the framework's request object                                        |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Explicit [fallback chains](../guide/fallbacks.md)                                                             |

### Base adapter options (`BaseAdapterOptions`)

| Option         | Type              | Default | Description                                                                                                                                                                                                                                                                            |
| -------------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries` | `DictionaryInput` | —       | The generated `dictionaries`; `{ ...dialex }` sets it. Pass your own `{ name: { locale: content } }` map or array of `defineDictionary` results only when you do not use the generated file. Without either, only dictionaries already registered through `defineDictionary` are found |
| `setHeader`    | `boolean`         | `true`  | Send the resolved locale as `Content-Language`                                                                                                                                                                                                                                         |

## What each adapter adds

| Adapter                 | Import               | Registered with                                      | The request gets                                        |
| ----------------------- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| [Express](#express)     | `dialexjs/express`   | `app.use(dialexExpress(options))`                    | `req.locale`, `req.getDictionary`, same on `res.locals` |
| [Fastify](#fastify)     | `dialexjs/fastify`   | `app.register(dialexPlugin, options)`                | `request.locale`, `request.getDictionary`               |
| [Koa](#koa)             | `dialexjs/koa`       | `app.use(dialexKoa(options))`                        | `ctx.locale`, `ctx.getDictionary`                       |
| [Hono](#hono)           | `dialexjs/hono`      | `app.use("*", dialexHono(options))`                  | `c.var.locale`, `c.var.getDictionary`                   |
| [Elysia](#elysia)       | `dialexjs/elysia`    | `app.use(dialexElysia(options))`                     | `locale`, `getDictionary`, `t` in the context           |
| [h3](#h3)               | `dialexjs/h3`        | default export of a Nitro middleware file            | `event.context.locale`, `.getDictionary`, `.t`          |
| [Hapi](#hapi)           | `dialexjs/hapi`      | `server.register({ plugin: dialexPlugin, options })` | `request.locale`, `request.getDictionary`               |
| [AdonisJS](#adonisjs)   | `dialexjs/adonis`    | `router.use([() => import("#middleware/dialex")])`   | `ctx.locale`, `ctx.getDictionary`                       |
| [NestJS](#nestjs)       | `dialexjs/nestjs`    | `DialexModule.forRoot(options)`                      | `req.locale`, `req.getDictionary`, decorators           |
| [SvelteKit](#sveltekit) | `dialexjs/sveltekit` | `export const handle = dialexHandle(options)`        | `event.locals.locale`, `.getDictionary`, `.t`           |
| [Astro](#astro)         | `dialexjs/astro`     | `export const onRequest = dialexAstro(options)`      | `Astro.locals.locale`, `.getDictionary`, `.t`           |
| [tRPC](#trpc)           | `dialexjs/trpc`      | spread into `createContext`                          | `ctx.locale`, `ctx.getDictionary`, `ctx.t`              |
| [Fetch API](#fetch-api) | `dialexjs/web`       | `createDialexHandler(options)(request)`              | `locale`, `getDictionary`, `t`, `headers`               |

## Express

```ts
import { dialexExpress } from "dialexjs/express";

function dialex(options?: ExpressDialexOptions): RequestHandler; // also exported as dialexExpress
```

Register it before your routes. Cookies are read from `req.cookies` when `cookie-parser` is installed, otherwise from the `Cookie` header. Options: `ExpressDialexOptions` (locale detection options, `dictionaries`, `setHeader`).

## Fastify

```ts
import dialexPlugin from "dialexjs/fastify";

const dialexPlugin: FastifyPluginAsync<FastifyDialexOptions>; // default export and named export
```

Needs Fastify 4 or later. Options: `FastifyDialexOptions`.

## Koa

```ts
import { dialexKoa } from "dialexjs/koa";

function dialex(options?: KoaDialexOptions): Middleware; // also the default export and dialexKoa
```

Options: `KoaDialexOptions`.

## Hono

```ts
import { dialexHono } from "dialexjs/hono";

function dialex(options?: HonoDialexOptions): MiddlewareHandler; // also exported as dialexHono
```

Read the values with `c.var.locale` and `c.var.getDictionary("home")`. Options: `HonoDialexOptions`.

## Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";

function dialex(options?: ElysiaDialexOptions): Elysia; // also the default export and dialexElysia
```

Adds `locale`, `getDictionary` and `t` through `derive`, so they are typed in every handler. Options: `ElysiaDialexOptions` (= `BaseAdapterOptions`).

## h3

```ts
import { dialexH3 } from "dialexjs/h3";

function dialex(options?: H3DialexOptions): EventHandler; // also the default export and dialexH3
```

For h3 1.x (Nitro 2, Nuxt 3 and 4 server routes). Options: `H3DialexOptions`.

## Hapi

```ts
import { dialexHapi } from "dialexjs/hapi";

const dialexPlugin: Plugin<HapiDialexOptions>; // also the default export and dialexHapi
```

Options: `HapiDialexOptions`. Decorates the request in `onRequest`.

## AdonisJS

```ts
import { createDialexMiddleware } from "dialexjs/adonis";

function createDialexMiddleware(options?: AdonisDialexOptions): MiddlewareClass; // also default and dialexAdonis
```

Returns a middleware **class** for AdonisJS 6 and later; export it as the default of a file in `app/middleware`. Options: `AdonisDialexOptions`.

## NestJS

```ts
import { DialexModule } from "dialexjs/nestjs";
```

| Export                               | Description                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot(options?)`     | A dynamic module. `NestDialexOptions` adds `isGlobal` (default `true`) to the locale detection options and `dictionaries` |
| `DialexModule.forRootAsync(options)` | Builds the options in `useFactory`, with `imports` and `inject` available. `NestDialexAsyncOptions`                       |
| `DialexService`                      | Injectable: `getDefaultLocale()`, `getSupportedLocales()`, `resolveLocale(req)`, `getDictionary(name, locale?)`           |
| `DialexMiddleware`                   | Sets `req.locale` and `req.getDictionary` and the `Content-Language` header                                               |
| `DialexInterceptor`                  | The same, as an interceptor                                                                                               |
| `@DialexLocale()`                    | Parameter decorator: the resolved locale                                                                                  |
| `@DialexDictionary(name)`            | Parameter decorator: the dictionary for the resolved locale                                                               |
| `DIALEX_OPTIONS`                     | The injection token of the options                                                                                        |

## SvelteKit

```ts
import { dialexHandle, LANG_PLACEHOLDER } from "dialexjs/sveltekit";

function dialexHandle(options?: SvelteKitDialexOptions): Handle; // also the default export
const LANG_PLACEHOLDER: "%dialex.lang%";
```

Sets `event.locals.locale`, `getDictionary` and `t`, and replaces `%dialex.lang%` in the rendered HTML with the locale, so `<html lang="%dialex.lang%">` in `src/app.html` is right. `Handle` is a local structural type that works with SvelteKit 2 and 3.

## Astro

```ts
import { dialexAstro } from "dialexjs/astro";

function dialex(options?: AstroDialexOptions): MiddlewareHandler; // also the default export and dialexAstro
```

Export it as `onRequest` from `src/middleware.ts`. Options: `AstroDialexOptions`.

## tRPC

```ts
import { createDialexContext } from "dialexjs/trpc";

function createDialexContext(
  options?: TrpcDialexOptions,
): (request: TrpcRequestLike) => TrpcDialexContext; // also default and dialexTrpc
```

`TrpcRequestLike` is a Fetch `Request`, or an object with `headers` and an optional `url`, which is what the fetch, Next.js, Express and standalone adapters pass to `createContext`. The result `{ locale, getDictionary, t }` belongs in your context.

## Fetch API

```ts
import createDialexHandler from "dialexjs/web";

function createDialexHandler(options?: WebDialexOptions): (request: Request) => Promise<WebDialex>;
```

For any runtime with a standard `Request` (React Router and Remix loaders, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun). `WebDialex` has `locale`, `getDictionary`, `t`, `headers` (`{ "Content-Language": ... }`, empty when `setHeader` is `false`) and `applyHeaders(response)`.

## `dialexjs/server`

```ts
import { createDialexServer } from "dialexjs/server";

function createDialexServer(source: DialexSource): DialexServer;

interface DialexServer {
  getDictionary<K extends DictionaryKey>(name: K, locale?: Locales): ResolveDictionaryType<K>;
  getT(locale?: Locales): Translate;
}
```

For code that is not tied to a request: Next.js Server Components, scripts, jobs. Create it once with the generated object:

```ts
// src/dialex.ts
import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

`locale` defaults to the configured default locale, and a locale without content falls back along the [fallback chain](../guide/fallbacks.md). It needs the eager generated file: with `lazy` loading use the client entry points.
