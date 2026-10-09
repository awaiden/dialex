# Çerçeveler

Dialex, her çerçeve için `dialexjs` paketinin bir alt yol dışa aktarımı olarak bir adaptör sunar.

| Çerçeve                     | İçe aktarma                                                                          | Giriş noktası                                                         |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withDialex`, `createDialexMiddleware`, `DialexLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `dialexPlugin`, `DialexProvider`, `useDialex`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `dialex()` middleware'i                                               |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `dialexPlugin`                                                        |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `dialex()` middleware'i                                               |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `dialex()` middleware'i                                               |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `DialexModule`, dekoratörler                                          |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `dialex()` eklentisi                                                  |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `dialexHandle()` hook'u                                               |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `dialex()` middleware'i                                               |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createDialex`, `useDialex`, `useDictionary`, Nuxt modülü             |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary`        |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `dialex()` middleware'i (h3 1.x)                                      |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | herhangi bir `Request` için `createDialexHandler()`                   |

Sunucu adaptörlerinin (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) hepsi aynı şekilde davranır: yerel ayarı çözer ([algılama bölümüne bakın](../guide/locale-detection.md)) ve istek üzerinde `locale` ile `getDictionary(name)` sunar. `dialex generate` çıktısını `dictionaries` olarak verin:

```ts
import dictionaries from "./src/dialex.generated.js";
```

Çerçeve paketleri (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) isteğe bağlı eş bağımlılıklardır (peer dependency); yalnızca kullandıklarınızı kurun.
