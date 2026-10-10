# Frameworks

Dialex incluye un adaptador por framework como exportación de subruta de `dialexjs`.

| Framework                   | Importación                                                         | Punto de entrada                                               |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `createDialexMiddleware`, `DialexLink`, `createDialexServer`   |
| [React / Vite](./react.md)  | `dialexjs/react`                                                    | `DialexProvider`, `useDialex`, `useDictionary`                 |
| [Express](./express.md)     | `dialexjs/express`                                                  | middleware `dialexExpress()`                                   |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                  | `dialexPlugin`                                                 |
| [Koa](./koa.md)             | `dialexjs/koa`                                                      | middleware `dialexKoa()`                                       |
| [Hono](./hono.md)           | `dialexjs/hono`                                                     | middleware `dialexHono()`                                      |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                   | `DialexModule`, decoradores                                    |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                   | plugin `dialexElysia()`                                        |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                | hook `dialexHandle()`                                          |
| [Astro](./astro.md)         | `dialexjs/astro`                                                    | middleware `dialexAstro()`                                     |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                     | `createDialex`, `useDialex`, `useDictionary`, módulo de Nuxt   |
| [Angular](./angular.md)     | `dialexjs/angular`                                                  | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary` |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                       | middleware `dialexH3()` (h3 1.x)                               |
| [Fetch API](./web.md)       | `dialexjs/web`                                                      | `createDialexHandler()` para cualquier `Request`               |

Todos los adaptadores de servidor (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) se comportan de la misma manera: resuelven el locale ([consulta la detección](../guide/locale-detection.md)) y exponen `locale` y `getDictionary(name)` en la petición. Pasa el objeto `dialex` de `dialex generate` al adaptador con spread. Contiene los diccionarios y la configuración de locales (`defaultLocale`, `locales`, `fallbacks`), así que no se repite nada a mano:

```ts
import { dialex } from "./src/dialex.generated.js";

app.use(dialexExpress({ ...dialex }));
```

Los paquetes de los frameworks (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) son dependencias peer opcionales; instala solo lo que uses.
