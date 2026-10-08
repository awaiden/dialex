# Frameworks

Dialex incluye un adaptador por framework como exportación de subruta de `dialexjs`.

| Framework                   | Importación                                                                          | Punto de entrada                                                |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | middleware `i18n()`                                             |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | middleware `i18n()`                                             |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | middleware `i18n()`                                             |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `I18nModule`, decoradores                                       |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | plugin `i18n()`                                                 |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | hook `i18nHandle()`                                             |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | middleware `i18n()`                                             |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createI18n`, `useI18n`, `useDictionary`, módulo de Nuxt        |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | middleware `i18n()` (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | `createI18nHandler()` para cualquier `Request`                  |

Todos los adaptadores de servidor (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) se comportan de la misma manera: resuelven el locale ([consulta la detección](../guide/locale-detection.md)) y exponen `locale` y `getDictionary(name)` en la petición. Pasa la salida de `dialex generate` como `dictionaries`:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Los paquetes de los frameworks (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) son dependencias peer opcionales; instala solo lo que uses.
