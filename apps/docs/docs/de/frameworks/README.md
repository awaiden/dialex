# Frameworks

Dialex liefert pro Framework einen Adapter als Subpfad-Export von `dialex` mit.

| Framework                   | Import                                                                       | Einstiegspunkt                                                  |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialex/next`, `dialex/next/middleware`, `dialex/next/link`, `dialex/server` | `withI18n`, `createI18nMiddleware`, `I18nLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialex/vite`, `dialex/react`                                                | `i18nPlugin`, `I18nProvider`, `useI18n`, `useDictionary`        |
| [Express](./express.md)     | `dialex/express`                                                             | `i18n()`-Middleware                                             |
| [Fastify](./fastify.md)     | `dialex/fastify`                                                             | `i18nPlugin`                                                    |
| [Koa](./koa.md)             | `dialex/koa`                                                                 | `i18n()`-Middleware                                             |
| [Hono](./hono.md)           | `dialex/hono`                                                                | `i18n()`-Middleware                                             |
| [NestJS](./nestjs.md)       | `dialex/nestjs`                                                              | `I18nModule`, Dekoratoren                                       |
| [Elysia](./elysia.md)       | `dialex/elysia`                                                              | `i18n()`-Plugin                                                 |
| [SvelteKit](./sveltekit.md) | `dialex/sveltekit`                                                           | `i18nHandle()`-Hook                                             |
| [Astro](./astro.md)         | `dialex/astro`                                                               | `i18n()`-Middleware                                             |
| [Vue / Nuxt](./vue.md)      | `dialex/vue`, `dialex/nuxt`                                                  | `createI18n`, `useI18n`, `useDictionary`, Nuxt-Modul            |
| [Angular](./angular.md)     | `dialex/angular`                                                             | `provideDialex`, `injectI18n`, `injectT`, `injectDictionary`    |
| [h3 / Nitro](./h3.md)       | `dialex/h3`                                                                  | `i18n()`-Middleware (h3 1.x)                                    |
| [Fetch API](./web.md)       | `dialex/web`                                                                 | `createI18nHandler()` für jeden `Request`                       |

Die Server-Adapter (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) verhalten sich alle gleich: Sie ermitteln das Locale ([siehe Erkennung](../guide/locale-detection.md)) und stellen `locale` und `getDictionary(name)` an der Anfrage bereit. Übergib die Ausgabe von `dialex generate` als `dictionaries`:

```ts
import dictionaries from "./src/i18n.generated.js";
```

Die Framework-Pakete (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) sind optionale Peer-Abhängigkeiten; installiere nur, was du verwendest.
