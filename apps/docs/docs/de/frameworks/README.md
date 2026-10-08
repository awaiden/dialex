# Frameworks

Dialex liefert pro Framework einen Adapter als Subpfad-Export von `dialexjs` mit.

| Framework                   | Import                                                                               | Einstiegspunkt                                                  |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `i18n()`-Middleware                                             |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `i18n()`-Middleware                                             |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `i18n()`-Middleware                                             |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `I18nModule`, Dekoratoren                                       |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `i18n()`-Plugin                                                 |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `i18nHandle()`-Hook                                             |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `i18n()`-Middleware                                             |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createI18n`, `useI18n`, `useDictionary`, Nuxt-Modul            |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `i18n()`-Middleware (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | `createI18nHandler()` für jeden `Request`                       |

Die Server-Adapter (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) verhalten sich alle gleich: Sie ermitteln das Locale ([siehe Erkennung](../guide/locale-detection.md)) und stellen `locale` und `getDictionary(name)` an der Anfrage bereit. Übergib die Ausgabe von `dialex generate` als `dictionaries`:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Die Framework-Pakete (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) sind optionale Peer-Abhängigkeiten; installiere nur, was du verwendest.
