# Frameworks

Dialex ships one adapter per framework as a subpath export of `dialexjs`.

| Framework                   | Import                                                                               | Entry point                                                     |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `i18n()` middleware                                             |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `i18n()` middleware                                             |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `i18n()` middleware                                             |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `I18nModule`, decorators                                        |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `i18n()` plugin                                                 |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `i18nHandle()` hook                                             |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `i18n()` middleware                                             |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createI18n`, `useI18n`, `useDictionary`, Nuxt module           |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `i18n()` middleware (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | `createI18nHandler()` for any `Request`                         |

The server adapters (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) all behave the same way: they resolve the locale ([see detection](../guide/locale-detection.md)) and expose `locale` and `getDictionary(name)` on the request. Pass the output of `dialex generate` as `dictionaries`:

```ts
import dictionaries from "./src/dialex.generated.js";
```

Framework packages (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) are optional peer dependencies; install only what you use.
