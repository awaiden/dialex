# Adaptadores de servidor

Cada adaptador de servidor resuelve el locale de la petición y luego añade a la petición `locale` y `getDictionary(name)` (y, donde el framework lo permite, `t`). Comparten un único conjunto de opciones y un único orden de detección. Las guías con ejemplos completos están en las [páginas de frameworks](../frameworks/README.md); cómo se elige un locale está en [Detección de locale](../guide/locale-detection.md).

Todos los adaptadores aceptan el objeto generado: `dialexExpress({ ...dialex })`.

## Opciones

Cada adaptador acepta las opciones de detección de locale y, salvo `createDialexMiddleware` de Next.js y el módulo de NestJS, las opciones base de adaptador.

### Opciones de detección de locale (`LocaleResolverOptions`)

| Opción          | Tipo                                   | Por defecto          | Descripción                                                                                                           |
| --------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `config`        | `GeneratedConfig`                      | —                    | La `config` generada. `{ ...dialex }` la establece. `defaultLocale`, `locales` y `fallbacks` de abajo la sobrescriben |
| `defaultLocale` | `string`                               | `"en"`               | Locale usado cuando nada coincide                                                                                     |
| `locales`       | `string[]`                             | —                    | Locales admitidos. Sin ella se ignora un prefijo de ruta y se acepta cualquier candidato                              |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Nombres de los parámetros de consulta                                                                                 |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Nombres de cookie                                                                                                     |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Cabecera que se lee                                                                                                   |
| `usePath`       | `boolean`                              | `true`               | Comprobar el primer segmento de la ruta de la URL (`/tr/...`)                                                         |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Extractor propio, se prueba primero. `req` es el objeto de petición del framework                                     |
| `fallbacks`     | `Record<string, string[]>`             | —                    | [Cadenas de fallback](../guide/fallbacks.md) explícitas                                                               |

### Opciones base de adaptador (`BaseAdapterOptions`)

| Opción         | Tipo              | Por defecto | Descripción                                                                                                                                                                                                                                                                                          |
| -------------- | ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries` | `DictionaryInput` | —           | Los `dictionaries` generados; `{ ...dialex }` los establece. Pase su propio mapa `{ name: { locale: content } }` o un array de resultados de `defineDictionary` solo si no usa el archivo generado. Sin ninguno de los dos solo se encuentran los diccionarios ya registrados con `defineDictionary` |
| `setHeader`    | `boolean`         | `true`      | Enviar el locale resuelto como `Content-Language`                                                                                                                                                                                                                                                    |

## Qué añade cada adaptador

| Adaptador               | Import               | Se registra con                                         | La petición recibe                                       |
| ----------------------- | -------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| [Express](#express)     | `dialexjs/express`   | `app.use(dialexExpress(options))`                       | `req.locale`, `req.getDictionary`, igual en `res.locals` |
| [Fastify](#fastify)     | `dialexjs/fastify`   | `app.register(dialexPlugin, options)`                   | `request.locale`, `request.getDictionary`                |
| [Koa](#koa)             | `dialexjs/koa`       | `app.use(dialexKoa(options))`                           | `ctx.locale`, `ctx.getDictionary`                        |
| [Hono](#hono)           | `dialexjs/hono`      | `app.use("*", dialexHono(options))`                     | `c.var.locale`, `c.var.getDictionary`                    |
| [Elysia](#elysia)       | `dialexjs/elysia`    | `app.use(dialexElysia(options))`                        | `locale`, `getDictionary`, `t` en el contexto            |
| [h3](#h3)               | `dialexjs/h3`        | export por defecto de un archivo de middleware de Nitro | `event.context.locale`, `.getDictionary`, `.t`           |
| [Hapi](#hapi)           | `dialexjs/hapi`      | `server.register({ plugin: dialexPlugin, options })`    | `request.locale`, `request.getDictionary`                |
| [AdonisJS](#adonisjs)   | `dialexjs/adonis`    | `router.use([() => import("#middleware/dialex")])`      | `ctx.locale`, `ctx.getDictionary`                        |
| [NestJS](#nestjs)       | `dialexjs/nestjs`    | `DialexModule.forRoot(options)`                         | `req.locale`, `req.getDictionary`, decoradores           |
| [SvelteKit](#sveltekit) | `dialexjs/sveltekit` | `export const handle = dialexHandle(options)`           | `event.locals.locale`, `.getDictionary`, `.t`            |
| [Astro](#astro)         | `dialexjs/astro`     | `export const onRequest = dialexAstro(options)`         | `Astro.locals.locale`, `.getDictionary`, `.t`            |
| [tRPC](#trpc)           | `dialexjs/trpc`      | se propaga en `createContext`                           | `ctx.locale`, `ctx.getDictionary`, `ctx.t`               |
| [Fetch API](#fetch-api) | `dialexjs/web`       | `createDialexHandler(options)(request)`                 | `locale`, `getDictionary`, `t`, `headers`                |

## Express

```ts
import { dialexExpress } from "dialexjs/express";

function dialex(options?: ExpressDialexOptions): RequestHandler; // also exported as dialexExpress
```

Regístralo antes de tus rutas. Las cookies se leen de `req.cookies` cuando `cookie-parser` está instalado y, si no, de la cabecera `Cookie`. Opciones: `ExpressDialexOptions` (opciones de detección de locale, `dictionaries`, `setHeader`).

## Fastify

```ts
import dialexPlugin from "dialexjs/fastify";

const dialexPlugin: FastifyPluginAsync<FastifyDialexOptions>; // default export and named export
```

Requiere Fastify 4 o posterior. Opciones: `FastifyDialexOptions`.

## Koa

```ts
import { dialexKoa } from "dialexjs/koa";

function dialex(options?: KoaDialexOptions): Middleware; // also the default export and dialexKoa
```

Opciones: `KoaDialexOptions`.

## Hono

```ts
import { dialexHono } from "dialexjs/hono";

function dialex(options?: HonoDialexOptions): MiddlewareHandler; // also exported as dialexHono
```

Lee los valores con `c.var.locale` y `c.var.getDictionary("home")`. Opciones: `HonoDialexOptions`.

## Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";

function dialex(options?: ElysiaDialexOptions): Elysia; // also the default export and dialexElysia
```

Añade `locale`, `getDictionary` y `t` mediante `derive`, así que están tipados en cada manejador. Opciones: `ElysiaDialexOptions` (= `BaseAdapterOptions`).

## h3

```ts
import { dialexH3 } from "dialexjs/h3";

function dialex(options?: H3DialexOptions): EventHandler; // also the default export and dialexH3
```

Para h3 1.x (rutas de servidor de Nitro 2 y de Nuxt 3 y 4). Opciones: `H3DialexOptions`.

## Hapi

```ts
import { dialexHapi } from "dialexjs/hapi";

const dialexPlugin: Plugin<HapiDialexOptions>; // also the default export and dialexHapi
```

Opciones: `HapiDialexOptions`. Decora la petición en `onRequest`.

## AdonisJS

```ts
import { createDialexMiddleware } from "dialexjs/adonis";

function createDialexMiddleware(options?: AdonisDialexOptions): MiddlewareClass; // also default and dialexAdonis
```

Devuelve una **clase** de middleware para AdonisJS 6 y posterior; expórtala como valor por defecto de un archivo en `app/middleware`. Opciones: `AdonisDialexOptions`.

## NestJS

```ts
import { DialexModule } from "dialexjs/nestjs";
```

| Export                               | Descripción                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DialexModule.forRoot(options?)`     | Un módulo dinámico. `NestDialexOptions` añade `isGlobal` (por defecto `true`) a las opciones de detección de locale y `dictionaries` |
| `DialexModule.forRootAsync(options)` | Construye las opciones en `useFactory`, con `imports` e `inject` disponibles. `NestDialexAsyncOptions`                               |
| `DialexService`                      | Inyectable: `getDefaultLocale()`, `getSupportedLocales()`, `resolveLocale(req)`, `getDictionary(name, locale?)`                      |
| `DialexMiddleware`                   | Establece `req.locale`, `req.getDictionary` y la cabecera `Content-Language`                                                         |
| `DialexInterceptor`                  | Lo mismo, como interceptor                                                                                                           |
| `@DialexLocale()`                    | Decorador de parámetro: el locale resuelto                                                                                           |
| `@DialexDictionary(name)`            | Decorador de parámetro: el diccionario para el locale resuelto                                                                       |
| `DIALEX_OPTIONS`                     | El token de inyección de las opciones                                                                                                |

## SvelteKit

```ts
import { dialexHandle, LANG_PLACEHOLDER } from "dialexjs/sveltekit";

function dialexHandle(options?: SvelteKitDialexOptions): Handle; // also the default export
const LANG_PLACEHOLDER: "%dialex.lang%";
```

Establece `event.locals.locale`, `getDictionary` y `t`, y sustituye `%dialex.lang%` en el HTML renderizado por el locale, de modo que `<html lang="%dialex.lang%">` en `src/app.html` sea correcto. `Handle` es un tipo estructural local que funciona con SvelteKit 2 y 3.

## Astro

```ts
import { dialexAstro } from "dialexjs/astro";

function dialex(options?: AstroDialexOptions): MiddlewareHandler; // also the default export and dialexAstro
```

Expórtalo como `onRequest` desde `src/middleware.ts`. Opciones: `AstroDialexOptions`.

## tRPC

```ts
import { createDialexContext } from "dialexjs/trpc";

function createDialexContext(
  options?: TrpcDialexOptions,
): (request: TrpcRequestLike) => TrpcDialexContext; // also default and dialexTrpc
```

`TrpcRequestLike` es un `Request` de Fetch, o un objeto con `headers` y un `url` opcional, que es lo que los adaptadores fetch, Next.js, Express y standalone pasan a `createContext`. El resultado `{ locale, getDictionary, t }` pertenece a tu contexto.

## Fetch API

```ts
import createDialexHandler from "dialexjs/web";

function createDialexHandler(options?: WebDialexOptions): (request: Request) => Promise<WebDialex>;
```

Para cualquier runtime con un `Request` estándar (loaders de React Router y Remix, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun). `WebDialex` tiene `locale`, `getDictionary`, `t`, `headers` (`{ "Content-Language": ... }`, vacío cuando `setHeader` es `false`) y `applyHeaders(response)`.

## `dialexjs/server`

```ts
import { createDialexServer } from "dialexjs/server";

function createDialexServer(source: DialexSource): DialexServer;

interface DialexServer {
  getDictionary<K extends DictionaryKey>(name: K, locale?: Locales): ResolveDictionaryType<K>;
  getT(locale?: Locales): Translate;
}
```

Para código que no está ligado a una petición: Server Components de Next.js, scripts, tareas. Créalo una vez con el objeto generado:

```ts
// src/dialex.ts
import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

`locale` por defecto es el locale por defecto configurado, y un locale sin contenido recurre a la [cadena de fallback](../guide/fallbacks.md). Necesita el archivo generado eager: con carga `lazy` usa los puntos de entrada de cliente.
