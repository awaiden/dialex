# Frameworks

Dialex ships one adapter per framework as a subpath export of `dialex`.

| Framework                   | Import                                                                       | Entry point                                                     |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialex/next`, `dialex/next/middleware`, `dialex/next/link`, `dialex/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialex/vite`, `dialex/react`                                                | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialex/express`                                                             | `i18n()` middleware                                             |
| [Fastify](./fastify.md)     | `dialex/fastify`                                                             | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialex/koa`                                                                 | `i18n()` middleware                                             |
| [Hono](./hono.md)           | `dialex/hono`                                                                | `i18n()` middleware                                             |
| [NestJS](./nestjs.md)       | `dialex/nestjs`                                                              | `I18nModule`, decorators                                        |
| [Elysia](./elysia.md)       | `dialex/elysia`                                                              | `i18n()` plugin                                                 |
| [SvelteKit](./sveltekit.md) | `dialex/sveltekit`                                                           | `i18nHandle()` hook                                             |
| [Astro](./astro.md)         | `dialex/astro`                                                               | `i18n()` middleware                                             |
| [Vue / Nuxt](./vue.md)      | `dialex/vue`, `dialex/nuxt`                                                  | `createI18n`, `useI18n`, `useDictionary`, Nuxt module           |
| [Angular](./angular.md)     | `dialex/angular`                                                             | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialex/h3`                                                                  | `i18n()` middleware (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialex/web`                                                                 | `createI18nHandler()` for any `Request`                         |

The server adapters (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) all behave the same way: they resolve the locale ([see detection](../guide/locale-detection.md)) and expose `locale` and `getDictionary(name)` on the request. Pass the output of `dialex generate` as `dictionaries`:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Framework packages (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) are optional peer dependencies; install only what you use.
