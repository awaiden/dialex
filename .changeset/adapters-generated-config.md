---
"dialexjs": minor
---

The server adapters (Express, Fastify, Hono, Koa, Elysia, h3, Astro, SvelteKit, NestJS, Fetch API, Angular) accept the generated `config`, so `{ ...dialex }` from `dialex.generated.ts` is all they need: `defaultLocale`, `locales` and `fallbacks` no longer have to be repeated by hand. Explicit options still win.

Express, Hono, Koa, Elysia, h3 and Astro also export `dialexExpress`, `dialexHono`, `dialexKoa`, `dialexElysia`, `dialexH3` and `dialexAstro`, so the adapter and the generated `dialex` object do not share a name. `dialex` keeps working.
