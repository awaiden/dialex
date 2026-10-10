# Çerçeveler

Dialex, her çerçeve için `dialexjs` paketinin bir alt yol dışa aktarımı olarak bir adaptör sunar.

| Çerçeve                           | İçe aktarma                                                         | Giriş noktası                                                  |
| --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Next.js](./nextjs.md)            | `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `createDialexMiddleware`, `DialexLink`, `createDialexServer`   |
| [React / Vite](./react.md)        | `dialexjs/react`                                                    | `DialexProvider`, `useDialex`, `useDictionary`                 |
| [React Router](./react-router.md) | `dialexjs/web`, `dialexjs/react`                                    | `createDialexHandler()`, `DialexProvider`                      |
| [Express](./express.md)           | `dialexjs/express`                                                  | `dialexExpress()` middleware'i                                 |
| [Fastify](./fastify.md)           | `dialexjs/fastify`                                                  | `dialexPlugin`                                                 |
| [Koa](./koa.md)                   | `dialexjs/koa`                                                      | `dialexKoa()` middleware'i                                     |
| [Hono](./hono.md)                 | `dialexjs/hono`                                                     | `dialexHono()` middleware'i                                    |
| [NestJS](./nestjs.md)             | `dialexjs/nestjs`                                                   | `DialexModule`, dekoratörler                                   |
| [Elysia](./elysia.md)             | `dialexjs/elysia`                                                   | `dialexElysia()` eklentisi                                     |
| [SvelteKit](./sveltekit.md)       | `dialexjs/sveltekit`                                                | `dialexHandle()` hook'u                                        |
| [Astro](./astro.md)               | `dialexjs/astro`                                                    | `dialexAstro()` middleware'i                                   |
| [Vue / Nuxt](./vue.md)            | `dialexjs/vue`, `dialexjs/nuxt`                                     | `createDialex`, `useDialex`, `useDictionary`, Nuxt modülü      |
| [Svelte](./svelte.md)             | `dialexjs/svelte`                                                   | `provideDialex`, `useDialex`, `useDictionary`, `useT`          |
| [Solid](./solid.md)               | `dialexjs/solid`                                                    | `DialexProvider`, `useDialex`, `useDictionary`, `useT`         |
| [Angular](./angular.md)           | `dialexjs/angular`                                                  | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary` |
| [h3 / Nitro](./h3.md)             | `dialexjs/h3`                                                       | `dialexH3()` middleware'i (h3 1.x)                             |
| [Fetch API](./web.md)             | `dialexjs/web`                                                      | herhangi bir `Request` için `createDialexHandler()`            |

Sunucu adaptörlerinin (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) hepsi aynı şekilde davranır: yerel ayarı çözer ([algılama bölümüne bakın](../guide/locale-detection.md)) ve istek üzerinde `locale` ile `getDictionary(name)` sunar. `dialex generate` çıktısındaki `dialex` nesnesini adaptöre yayarak (spread) verin. Sözlükleri ve dil yapılandırmasını (`defaultLocale`, `locales`, `fallbacks`) taşır; böylece elle hiçbir şey tekrarlanmaz:

```ts
import { dialex } from "./src/dialex.generated.js";

app.use(dialexExpress({ ...dialex }));
```

Çerçeve paketleri (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) isteğe bağlı eş bağımlılıklardır (peer dependency); yalnızca kullandıklarınızı kurun.
