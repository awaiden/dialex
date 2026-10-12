# Server-Adapter

Jeder Server-Adapter löst die Locale des Requests auf und fügt dem Request dann `locale` und `getDictionary(name)` hinzu (und, wo das Framework es erlaubt, `t`). Sie teilen sich einen Satz Optionen und eine Erkennungsreihenfolge. Anleitungen mit vollständigen Beispielen stehen auf den [Framework-Seiten](../frameworks/README.md); wie eine Locale gewählt wird, steht unter [Locale-Erkennung](../guide/locale-detection.md).

Alle Adapter akzeptieren das generierte Objekt: `dialexExpress({ ...dialex })`.

## Optionen

Jeder Adapter nimmt die Optionen zur Locale-Erkennung und, außer `createDialexMiddleware` von Next.js und dem NestJS-Modul, die Basis-Adapteroptionen.

### Optionen zur Locale-Erkennung (`LocaleResolverOptions`)

| Option          | Typ                                    | Standard             | Beschreibung                                                                                                           |
| --------------- | -------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `config`        | `GeneratedConfig`                      | —                    | Die generierte `config`. `{ ...dialex }` setzt sie. `defaultLocale`, `locales` und `fallbacks` unten überschreiben sie |
| `defaultLocale` | `string`                               | `"en"`               | Locale, wenn nichts passt                                                                                              |
| `locales`       | `string[]`                             | —                    | Unterstützte Locales. Ohne sie wird ein Pfadpräfix ignoriert und jeder Kandidat akzeptiert                             |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Namen der Query-Parameter                                                                                              |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie-Namen                                                                                                           |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Zu lesender Header                                                                                                     |
| `usePath`       | `boolean`                              | `true`               | Das erste URL-Pfadsegment prüfen (`/tr/...`)                                                                           |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Eigener Extraktor, wird zuerst versucht. `req` ist das Request-Objekt des Frameworks                                   |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Explizite [Fallback-Ketten](../guide/fallbacks.md)                                                                     |

### Basis-Adapteroptionen (`BaseAdapterOptions`)

| Option         | Typ               | Standard | Beschreibung                                                                                                                                                                                                                                                                                                     |
| -------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries` | `DictionaryInput` | —        | Die generierten `dictionaries`; `{ ...dialex }` setzt sie. Übergeben Sie eine eigene Map `{ name: { locale: content } }` oder ein Array von `defineDictionary`-Ergebnissen nur, wenn Sie die generierte Datei nicht verwenden. Ohne beides werden nur über `defineDictionary` registrierte Wörterbücher gefunden |
| `setHeader`    | `boolean`         | `true`   | Die aufgelöste Locale als `Content-Language` senden                                                                                                                                                                                                                                                              |

## Was jeder Adapter hinzufügt

| Adapter                 | Import               | Registrierung                                        | Der Request erhält                                         |
| ----------------------- | -------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| [Express](#express)     | `dialexjs/express`   | `app.use(dialexExpress(options))`                    | `req.locale`, `req.getDictionary`, gleich auf `res.locals` |
| [Fastify](#fastify)     | `dialexjs/fastify`   | `app.register(dialexPlugin, options)`                | `request.locale`, `request.getDictionary`                  |
| [Koa](#koa)             | `dialexjs/koa`       | `app.use(dialexKoa(options))`                        | `ctx.locale`, `ctx.getDictionary`                          |
| [Hono](#hono)           | `dialexjs/hono`      | `app.use("*", dialexHono(options))`                  | `c.var.locale`, `c.var.getDictionary`                      |
| [Elysia](#elysia)       | `dialexjs/elysia`    | `app.use(dialexElysia(options))`                     | `locale`, `getDictionary`, `t` im Kontext                  |
| [h3](#h3)               | `dialexjs/h3`        | Default-Export einer Nitro-Middleware-Datei          | `event.context.locale`, `.getDictionary`, `.t`             |
| [Hapi](#hapi)           | `dialexjs/hapi`      | `server.register({ plugin: dialexPlugin, options })` | `request.locale`, `request.getDictionary`                  |
| [AdonisJS](#adonisjs)   | `dialexjs/adonis`    | `router.use([() => import("#middleware/dialex")])`   | `ctx.locale`, `ctx.getDictionary`                          |
| [NestJS](#nestjs)       | `dialexjs/nestjs`    | `DialexModule.forRoot(options)`                      | `req.locale`, `req.getDictionary`, Dekoratoren             |
| [SvelteKit](#sveltekit) | `dialexjs/sveltekit` | `export const handle = dialexHandle(options)`        | `event.locals.locale`, `.getDictionary`, `.t`              |
| [Astro](#astro)         | `dialexjs/astro`     | `export const onRequest = dialexAstro(options)`      | `Astro.locals.locale`, `.getDictionary`, `.t`              |
| [tRPC](#trpc)           | `dialexjs/trpc`      | in `createContext` gespreadet                        | `ctx.locale`, `ctx.getDictionary`, `ctx.t`                 |
| [Fetch API](#fetch-api) | `dialexjs/web`       | `createDialexHandler(options)(request)`              | `locale`, `getDictionary`, `t`, `headers`                  |

## Express

```ts
import { dialexExpress } from "dialexjs/express";

function dialex(options?: ExpressDialexOptions): RequestHandler; // also exported as dialexExpress
```

Registriere ihn vor deinen Routen. Cookies werden aus `req.cookies` gelesen, wenn `cookie-parser` installiert ist, sonst aus dem `Cookie`-Header. Optionen: `ExpressDialexOptions` (Optionen zur Locale-Erkennung, `dictionaries`, `setHeader`).

## Fastify

```ts
import dialexPlugin from "dialexjs/fastify";

const dialexPlugin: FastifyPluginAsync<FastifyDialexOptions>; // default export and named export
```

Benötigt Fastify 4 oder neuer. Optionen: `FastifyDialexOptions`.

## Koa

```ts
import { dialexKoa } from "dialexjs/koa";

function dialex(options?: KoaDialexOptions): Middleware; // also the default export and dialexKoa
```

Optionen: `KoaDialexOptions`.

## Hono

```ts
import { dialexHono } from "dialexjs/hono";

function dialex(options?: HonoDialexOptions): MiddlewareHandler; // also exported as dialexHono
```

Lies die Werte mit `c.var.locale` und `c.var.getDictionary("home")`. Optionen: `HonoDialexOptions`.

## Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";

function dialex(options?: ElysiaDialexOptions): Elysia; // also the default export and dialexElysia
```

Fügt `locale`, `getDictionary` und `t` über `derive` hinzu, sodass sie in jedem Handler typisiert sind. Optionen: `ElysiaDialexOptions` (= `BaseAdapterOptions`).

## h3

```ts
import { dialexH3 } from "dialexjs/h3";

function dialex(options?: H3DialexOptions): EventHandler; // also the default export and dialexH3
```

Für h3 1.x (Server-Routen von Nitro 2 sowie Nuxt 3 und 4). Optionen: `H3DialexOptions`.

## Hapi

```ts
import { dialexHapi } from "dialexjs/hapi";

const dialexPlugin: Plugin<HapiDialexOptions>; // also the default export and dialexHapi
```

Optionen: `HapiDialexOptions`. Dekoriert den Request in `onRequest`.

## AdonisJS

```ts
import { createDialexMiddleware } from "dialexjs/adonis";

function createDialexMiddleware(options?: AdonisDialexOptions): MiddlewareClass; // also default and dialexAdonis
```

Liefert eine Middleware-**Klasse** für AdonisJS 6 und neuer; exportiere sie als Default einer Datei in `app/middleware`. Optionen: `AdonisDialexOptions`.

## NestJS

```ts
import { DialexModule } from "dialexjs/nestjs";
```

| Export                               | Beschreibung                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot(options?)`     | Ein dynamisches Modul. `NestDialexOptions` ergänzt `isGlobal` (Standard `true`) zu den Optionen zur Locale-Erkennung und `dictionaries` |
| `DialexModule.forRootAsync(options)` | Baut die Optionen in `useFactory`, mit `imports` und `inject`. `NestDialexAsyncOptions`                                                 |
| `DialexService`                      | Injizierbar: `getDefaultLocale()`, `getSupportedLocales()`, `resolveLocale(req)`, `getDictionary(name, locale?)`                        |
| `DialexMiddleware`                   | Setzt `req.locale` und `req.getDictionary` sowie den Header `Content-Language`                                                          |
| `DialexInterceptor`                  | Dasselbe als Interceptor                                                                                                                |
| `@DialexLocale()`                    | Parameter-Dekorator: die aufgelöste Locale                                                                                              |
| `@DialexDictionary(name)`            | Parameter-Dekorator: das Wörterbuch für die aufgelöste Locale                                                                           |
| `DIALEX_OPTIONS`                     | Das Injection-Token der Optionen                                                                                                        |

## SvelteKit

```ts
import { dialexHandle, LANG_PLACEHOLDER } from "dialexjs/sveltekit";

function dialexHandle(options?: SvelteKitDialexOptions): Handle; // also the default export
const LANG_PLACEHOLDER: "%dialex.lang%";
```

Setzt `event.locals.locale`, `getDictionary` und `t` und ersetzt `%dialex.lang%` im gerenderten HTML durch die Locale, sodass `<html lang="%dialex.lang%">` in `src/app.html` stimmt. `Handle` ist ein lokaler struktureller Typ, der mit SvelteKit 2 und 3 funktioniert.

## Astro

```ts
import { dialexAstro } from "dialexjs/astro";

function dialex(options?: AstroDialexOptions): MiddlewareHandler; // also the default export and dialexAstro
```

Exportiere ihn als `onRequest` aus `src/middleware.ts`. Optionen: `AstroDialexOptions`.

## tRPC

```ts
import { createDialexContext } from "dialexjs/trpc";

function createDialexContext(
  options?: TrpcDialexOptions,
): (request: TrpcRequestLike) => TrpcDialexContext; // also default and dialexTrpc
```

`TrpcRequestLike` ist ein Fetch-`Request` oder ein Objekt mit `headers` und optionalem `url`; genau das übergeben die Fetch-, Next.js-, Express- und Standalone-Adapter an `createContext`. Das Ergebnis `{ locale, getDictionary, t }` gehört in deinen Kontext.

## Fetch API

```ts
import createDialexHandler from "dialexjs/web";

function createDialexHandler(options?: WebDialexOptions): (request: Request) => Promise<WebDialex>;
```

Für jede Laufzeit mit einem Standard-`Request` (Loader von React Router und Remix, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun). `WebDialex` hat `locale`, `getDictionary`, `t`, `headers` (`{ "Content-Language": ... }`, leer, wenn `setHeader` `false` ist) und `applyHeaders(response)`.

## `dialexjs/server`

```ts
import { createDialexServer } from "dialexjs/server";

function createDialexServer(source: DialexSource): DialexServer;

interface DialexServer {
  getDictionary<K extends DictionaryKey>(name: K, locale?: Locales): ResolveDictionaryType<K>;
  getT(locale?: Locales): Translate;
}
```

Für Code, der nicht an einen Request gebunden ist: Next.js Server Components, Skripte, Jobs. Erzeuge es einmal mit dem generierten Objekt:

```ts
// src/dialex.ts
import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

`locale` ist standardmäßig die konfigurierte Standard-Locale, und eine Locale ohne Inhalt fällt entlang der [Fallback-Kette](../guide/fallbacks.md) zurück. Es braucht die eager generierte Datei: Bei `lazy`-Laden nimm die Client-Einstiegspunkte.
