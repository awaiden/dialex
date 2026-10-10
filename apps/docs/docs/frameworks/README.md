# Frameworks

Dialex ships one adapter per framework as a subpath export of `dialexjs`.

| Framework                   | Import                                                              | Entry point                                                    |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `createDialexMiddleware`, `DialexLink`, `createDialexServer`   |
| [React / Vite](./react.md)  | `dialexjs/react`                                                    | `DialexProvider`, `useDialex`, `useDictionary`                 |
| [Express](./express.md)     | `dialexjs/express`                                                  | `dialexExpress()` middleware                                   |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                  | `dialexPlugin`                                                 |
| [Koa](./koa.md)             | `dialexjs/koa`                                                      | `dialexKoa()` middleware                                       |
| [Hono](./hono.md)           | `dialexjs/hono`                                                     | `dialexHono()` middleware                                      |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                   | `DialexModule`, decorators                                     |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                   | `dialexElysia()` plugin                                        |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                | `dialexHandle()` hook                                          |
| [Astro](./astro.md)         | `dialexjs/astro`                                                    | `dialexAstro()` middleware                                     |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                     | `createDialex`, `useDialex`, `useDictionary`, Nuxt module      |
| [Angular](./angular.md)     | `dialexjs/angular`                                                  | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary` |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                       | `dialexH3()` middleware (h3 1.x)                               |
| [Fetch API](./web.md)       | `dialexjs/web`                                                      | `createDialexHandler()` for any `Request`                      |

The server adapters (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) all behave the same way: they resolve the locale ([see detection](../guide/locale-detection.md)) and expose `locale` and `getDictionary(name)` on the request. Spread the `dialex` object from `dialex generate` into the adapter. It carries the dictionaries and the locale config (`defaultLocale`, `locales`, `fallbacks`), so nothing is repeated by hand:

```ts
import { dialex } from "./src/dialex.generated.js";

app.use(dialexExpress({ ...dialex }));
```

Framework packages (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) are optional peer dependencies; install only what you use.
