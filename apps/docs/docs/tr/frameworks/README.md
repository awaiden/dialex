# Çerçeveler

Dialex, her çerçeve için `dialexjs` paketinin bir alt yol dışa aktarımı olarak bir adaptör sunar.

| Çerçeve                     | İçe aktarma                                                                          | Giriş noktası                                                   |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `i18n()` middleware'i                                           |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `i18n()` middleware'i                                           |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `i18n()` middleware'i                                           |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `I18nModule`, dekoratörler                                      |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `i18n()` eklentisi                                              |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `i18nHandle()` hook'u                                           |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `i18n()` middleware'i                                           |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createI18n`, `useI18n`, `useDictionary`, Nuxt modülü           |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `i18n()` middleware'i (h3 1.x)                                  |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | herhangi bir `Request` için `createI18nHandler()`               |

Sunucu adaptörlerinin (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) hepsi aynı şekilde davranır: yerel ayarı çözer ([algılama bölümüne bakın](../guide/locale-detection.md)) ve istek üzerinde `locale` ile `getDictionary(name)` sunar. `dialex generate` çıktısını `dictionaries` olarak verin:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Çerçeve paketleri (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) isteğe bağlı eş bağımlılıklardır (peer dependency); yalnızca kullandıklarınızı kurun.
