# Sunucu adaptörleri

Her sunucu adaptörü isteğin yerel ayarını çözer, sonra isteğe `locale` ve `getDictionary(name)` ekler (framework izin veriyorsa `t` de). Hepsi tek bir seçenek kümesini ve tek bir algılama sırasını paylaşır. Eksiksiz örnekli rehberler [framework sayfalarında](../frameworks/README.md); yerel ayarın nasıl seçildiği [Yerel ayar algılama](../guide/locale-detection.md) sayfasındadır.

Tüm adaptörler üretilen nesneyi kabul eder: `dialexExpress({ ...dialex })`.

## Seçenekler

Her adaptör yerel ayar algılama seçeneklerini ve, Next.js'in `createDialexMiddleware`'i ile NestJS modülü dışında, temel adaptör seçeneklerini alır.

### Yerel ayar algılama seçenekleri (`LocaleResolverOptions`)

| Seçenek         | Tip                                    | Varsayılan           | Açıklama                                                                                                                 |
| --------------- | -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `config`        | `GeneratedConfig`                      | —                    | Üretilen `config`. `{ ...dialex }` bunu ayarlar. Aşağıdaki `defaultLocale`, `locales` ve `fallbacks` bunu geçersiz kılar |
| `defaultLocale` | `string`                               | `"en"`               | Hiçbiri eşleşmediğinde kullanılan yerel ayar                                                                             |
| `locales`       | `string[]`                             | —                    | Desteklenen yerel ayarlar. Olmazsa yol öneki yok sayılır ve her aday kabul edilir                                        |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Sorgu parametresi adları                                                                                                 |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Çerez adları                                                                                                             |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Okunacak başlık                                                                                                          |
| `usePath`       | `boolean`                              | `true`               | URL yolunun ilk bölümüne bak (`/tr/...`)                                                                                 |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Özel çıkarıcı, önce denenir. `req` framework'ün istek nesnesidir                                                         |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Açık [yedek zincirleri](../guide/fallbacks.md)                                                                           |

### Temel adaptör seçenekleri (`BaseAdapterOptions`)

| Seçenek        | Tip               | Varsayılan | Açıklama                                                                                                                                                     |
| -------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dictionaries` | `DictionaryInput` | —          | `{ name: { locale: content } }` haritası ya da `defineDictionary` sonuçlarının dizisi. Olmazsa yalnızca `defineDictionary` ile kaydedilmiş sözlükler bulunur |
| `setHeader`    | `boolean`         | `true`     | Çözümlenen yerel ayarı `Content-Language` olarak gönder                                                                                                      |

## Her adaptör ne ekler

| Adaptör                 | İçe aktarım          | Kayıt                                                    | İstek şunları alır                                                 |
| ----------------------- | -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| [Express](#express)     | `dialexjs/express`   | `app.use(dialexExpress(options))`                        | `req.locale`, `req.getDictionary`, `res.locals` üzerinde de aynısı |
| [Fastify](#fastify)     | `dialexjs/fastify`   | `app.register(dialexPlugin, options)`                    | `request.locale`, `request.getDictionary`                          |
| [Koa](#koa)             | `dialexjs/koa`       | `app.use(dialexKoa(options))`                            | `ctx.locale`, `ctx.getDictionary`                                  |
| [Hono](#hono)           | `dialexjs/hono`      | `app.use("*", dialexHono(options))`                      | `c.var.locale`, `c.var.getDictionary`                              |
| [Elysia](#elysia)       | `dialexjs/elysia`    | `app.use(dialexElysia(options))`                         | bağlamda `locale`, `getDictionary`, `t`                            |
| [h3](#h3)               | `dialexjs/h3`        | bir Nitro middleware dosyasının varsayılan dışa aktarımı | `event.context.locale`, `.getDictionary`, `.t`                     |
| [Hapi](#hapi)           | `dialexjs/hapi`      | `server.register({ plugin: dialexPlugin, options })`     | `request.locale`, `request.getDictionary`                          |
| [AdonisJS](#adonisjs)   | `dialexjs/adonis`    | `router.use([() => import("#middleware/dialex")])`       | `ctx.locale`, `ctx.getDictionary`                                  |
| [NestJS](#nestjs)       | `dialexjs/nestjs`    | `DialexModule.forRoot(options)`                          | `req.locale`, `req.getDictionary`, dekoratörler                    |
| [SvelteKit](#sveltekit) | `dialexjs/sveltekit` | `export const handle = dialexHandle(options)`            | `event.locals.locale`, `.getDictionary`, `.t`                      |
| [Astro](#astro)         | `dialexjs/astro`     | `export const onRequest = dialexAstro(options)`          | `Astro.locals.locale`, `.getDictionary`, `.t`                      |
| [tRPC](#trpc)           | `dialexjs/trpc`      | `createContext` içine yayılır                            | `ctx.locale`, `ctx.getDictionary`, `ctx.t`                         |
| [Fetch API](#fetch-api) | `dialexjs/web`       | `createDialexHandler(options)(request)`                  | `locale`, `getDictionary`, `t`, `headers`                          |

## Express

```ts
import { dialexExpress } from "dialexjs/express";

function dialex(options?: ExpressDialexOptions): RequestHandler; // also exported as dialexExpress
```

Rotalarınızdan önce kaydedin. Çerezler, `cookie-parser` kuruluysa `req.cookies`'ten, değilse `Cookie` başlığından okunur. Seçenekler: `ExpressDialexOptions` (yerel ayar algılama seçenekleri, `dictionaries`, `setHeader`).

## Fastify

```ts
import dialexPlugin from "dialexjs/fastify";

const dialexPlugin: FastifyPluginAsync<FastifyDialexOptions>; // default export and named export
```

Fastify 4 ya da sonrasını gerektirir. Seçenekler: `FastifyDialexOptions`.

## Koa

```ts
import { dialexKoa } from "dialexjs/koa";

function dialex(options?: KoaDialexOptions): Middleware; // also the default export and dialexKoa
```

Seçenekler: `KoaDialexOptions`.

## Hono

```ts
import { dialexHono } from "dialexjs/hono";

function dialex(options?: HonoDialexOptions): MiddlewareHandler; // also exported as dialexHono
```

Değerleri `c.var.locale` ve `c.var.getDictionary("home")` ile okuyun. Seçenekler: `HonoDialexOptions`.

## Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";

function dialex(options?: ElysiaDialexOptions): Elysia; // also the default export and dialexElysia
```

`locale`, `getDictionary` ve `t` değerlerini `derive` ile ekler; böylece her işleyicide tiplidirler. Seçenekler: `ElysiaDialexOptions` (= `BaseAdapterOptions`).

## h3

```ts
import { dialexH3 } from "dialexjs/h3";

function dialex(options?: H3DialexOptions): EventHandler; // also the default export and dialexH3
```

h3 1.x için (Nitro 2 ile Nuxt 3 ve 4 sunucu rotaları). Seçenekler: `H3DialexOptions`.

## Hapi

```ts
import { dialexHapi } from "dialexjs/hapi";

const dialexPlugin: Plugin<HapiDialexOptions>; // also the default export and dialexHapi
```

Seçenekler: `HapiDialexOptions`. İsteği `onRequest` içinde dekore eder.

## AdonisJS

```ts
import { createDialexMiddleware } from "dialexjs/adonis";

function createDialexMiddleware(options?: AdonisDialexOptions): MiddlewareClass; // also default and dialexAdonis
```

AdonisJS 6 ve sonrası için bir middleware **sınıfı** döndürür; `app/middleware` içindeki bir dosyanın varsayılan dışa aktarımı yapın. Seçenekler: `AdonisDialexOptions`.

## NestJS

```ts
import { DialexModule } from "dialexjs/nestjs";
```

| Dışa aktarım                         | Açıklama                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `DialexModule.forRoot(options?)`     | Dinamik modül. `NestDialexOptions`, yerel ayar algılama seçeneklerine ve `dictionaries`'e `isGlobal` (varsayılan `true`) ekler |
| `DialexModule.forRootAsync(options)` | Seçenekleri `useFactory` içinde, `imports` ve `inject` ile kurar. `NestDialexAsyncOptions`                                     |
| `DialexService`                      | Enjekte edilebilir: `getDefaultLocale()`, `getSupportedLocales()`, `resolveLocale(req)`, `getDictionary(name, locale?)`        |
| `DialexMiddleware`                   | `req.locale` ve `req.getDictionary` ile `Content-Language` başlığını ayarlar                                                   |
| `DialexInterceptor`                  | Aynısı, interceptor olarak                                                                                                     |
| `@DialexLocale()`                    | Parametre dekoratörü: çözümlenen yerel ayar                                                                                    |
| `@DialexDictionary(name)`            | Parametre dekoratörü: çözümlenen yerel ayar için sözlük                                                                        |
| `DIALEX_OPTIONS`                     | Seçeneklerin enjeksiyon belirteci                                                                                              |

## SvelteKit

```ts
import { dialexHandle, LANG_PLACEHOLDER } from "dialexjs/sveltekit";

function dialexHandle(options?: SvelteKitDialexOptions): Handle; // also the default export
const LANG_PLACEHOLDER: "%dialex.lang%";
```

`event.locals.locale`, `getDictionary` ve `t` değerlerini ayarlar ve render edilen HTML'deki `%dialex.lang%` ifadesini yerel ayarla değiştirir; böylece `src/app.html` içindeki `<html lang="%dialex.lang%">` doğru olur. `Handle`, SvelteKit 2 ve 3 ile çalışan yerel bir yapısal tiptir.

## Astro

```ts
import { dialexAstro } from "dialexjs/astro";

function dialex(options?: AstroDialexOptions): MiddlewareHandler; // also the default export and dialexAstro
```

`src/middleware.ts` içinden `onRequest` olarak dışa aktarın. Seçenekler: `AstroDialexOptions`.

## tRPC

```ts
import { createDialexContext } from "dialexjs/trpc";

function createDialexContext(
  options?: TrpcDialexOptions,
): (request: TrpcRequestLike) => TrpcDialexContext; // also default and dialexTrpc
```

`TrpcRequestLike`, bir Fetch `Request`'i ya da `headers` ve isteğe bağlı `url` taşıyan bir nesnedir; fetch, Next.js, Express ve standalone adaptörlerin `createContext`'e verdiği budur. `{ locale, getDictionary, t }` sonucu bağlamınıza aittir.

## Fetch API

```ts
import createDialexHandler from "dialexjs/web";

function createDialexHandler(options?: WebDialexOptions): (request: Request) => Promise<WebDialex>;
```

Standart `Request` sunan her çalışma zamanı için (React Router ve Remix loader'ları, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun). `WebDialex` şunları taşır: `locale`, `getDictionary`, `t`, `headers` (`{ "Content-Language": ... }`, `setHeader` `false` ise boş) ve `applyHeaders(response)`.

## `dialexjs/server`

```ts
import { createDialexServer } from "dialexjs/server";

function createDialexServer(source: DialexSource): DialexServer;

interface DialexServer {
  getDictionary<K extends DictionaryKey>(name: K, locale?: Locales): ResolveDictionaryType<K>;
  getT(locale?: Locales): Translate;
}
```

Bir isteğe bağlı olmayan kod için: Next.js Server Component'leri, betikler, işler. Üretilen nesneyle bir kez oluşturun:

```ts
// src/dialex.ts
import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

`locale` varsayılan olarak yapılandırılmış varsayılan yerel ayardır ve içeriği olmayan bir yerel ayar [yedek zincirine](../guide/fallbacks.md) düşer. Eager üretilen dosyayı gerektirir: `lazy` yüklemede istemci giriş noktalarını kullanın.
