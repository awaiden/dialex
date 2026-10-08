# Frameworks

Dialex incluye un adaptador por framework como exportación de subruta de `dialex`.

| Framework                   | Importación                                                                  | Punto de entrada                                                |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialex/next`, `dialex/next/middleware`, `dialex/next/link`, `dialex/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialex/vite`, `dialex/react`                                                | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialex/express`                                                             | middleware `i18n()`                                             |
| [Fastify](./fastify.md)     | `dialex/fastify`                                                             | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialex/koa`                                                                 | middleware `i18n()`                                             |
| [Hono](./hono.md)           | `dialex/hono`                                                                | middleware `i18n()`                                             |
| [NestJS](./nestjs.md)       | `dialex/nestjs`                                                              | `I18nModule`, decoradores                                       |
| [Elysia](./elysia.md)       | `dialex/elysia`                                                              | plugin `i18n()`                                                 |
| [SvelteKit](./sveltekit.md) | `dialex/sveltekit`                                                           | hook `i18nHandle()`                                             |
| [Astro](./astro.md)         | `dialex/astro`                                                               | middleware `i18n()`                                             |
| [Vue / Nuxt](./vue.md)      | `dialex/vue`, `dialex/nuxt`                                                  | `createI18n`, `useI18n`, `useDictionary`, módulo de Nuxt        |
| [Angular](./angular.md)     | `dialex/angular`                                                             | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialex/h3`                                                                  | middleware `i18n()` (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialex/web`                                                                 | `createI18nHandler()` para cualquier `Request`                  |

Todos los adaptadores de servidor (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) se comportan de la misma manera: resuelven el locale ([consulta la detección](../guide/locale-detection.md)) y exponen `locale` y `getDictionary(name)` en la petición. Pasa la salida de `dialex generate` como `dictionaries`:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Los paquetes de los frameworks (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) son dependencias peer opcionales; instala solo lo que uses.
