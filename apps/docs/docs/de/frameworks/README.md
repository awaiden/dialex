# Frameworks

Dialex liefert pro Framework einen Adapter als Subpfad-Export von `dialexjs` mit.

| Framework                   | Import                                                                               | Einstiegspunkt                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [Next.js](./nextjs.md)      | `dialexjs/next`, `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server` | `withDialex`, `createDialexMiddleware`, `DialexLink`, `getDictionary` |
| [React / Vite](./react.md)  | `dialexjs/vite`, `dialexjs/react`                                                    | `dialexPlugin`, `DialexProvider`, `useDialex`, `useDictionary`        |
| [Express](./express.md)     | `dialexjs/express`                                                                   | `dialex()`-Middleware                                                 |
| [Fastify](./fastify.md)     | `dialexjs/fastify`                                                                   | `dialexPlugin`                                                        |
| [Koa](./koa.md)             | `dialexjs/koa`                                                                       | `dialex()`-Middleware                                                 |
| [Hono](./hono.md)           | `dialexjs/hono`                                                                      | `dialex()`-Middleware                                                 |
| [NestJS](./nestjs.md)       | `dialexjs/nestjs`                                                                    | `DialexModule`, Dekoratoren                                           |
| [Elysia](./elysia.md)       | `dialexjs/elysia`                                                                    | `dialex()`-Plugin                                                     |
| [SvelteKit](./sveltekit.md) | `dialexjs/sveltekit`                                                                 | `dialexHandle()`-Hook                                                 |
| [Astro](./astro.md)         | `dialexjs/astro`                                                                     | `dialex()`-Middleware                                                 |
| [Vue / Nuxt](./vue.md)      | `dialexjs/vue`, `dialexjs/nuxt`                                                      | `createDialex`, `useDialex`, `useDictionary`, Nuxt-Modul              |
| [Angular](./angular.md)     | `dialexjs/angular`                                                                   | `provideDialex`, `injectDialex`, `injectT`, `injectDictionary`        |
| [h3 / Nitro](./h3.md)       | `dialexjs/h3`                                                                        | `dialex()`-Middleware (h3 1.x)                                        |
| [Fetch API](./web.md)       | `dialexjs/web`                                                                       | `createDialexHandler()` für jeden `Request`                           |

Die Server-Adapter (Express, Fastify, Koa, Hono, NestJS, Elysia, SvelteKit, Astro, h3) verhalten sich alle gleich: Sie ermitteln das Locale ([siehe Erkennung](../guide/locale-detection.md)) und stellen `locale` und `getDictionary(name)` an der Anfrage bereit. Übergib die Ausgabe von `dialex generate` als `dictionaries`:

```ts
import dictionaries from "./src/dialex.generated.js";
```

Die Framework-Pakete (`express`, `fastify`, `hono`, `koa`, `elysia`, `astro`, `h3`, `@angular/core`, `next`, `react`, `vue`, `@nuxt/kit`, `@nestjs/*`, `rxjs`, `vite`) sind optionale Peer-Abhängigkeiten; installiere nur, was du verwendest.
