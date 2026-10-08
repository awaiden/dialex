# dialex init

Initializes Dialex in the current project.

- Detects the framework (Next.js, Fastify, Koa, Hono, Express, NestJS, Elysia, SvelteKit, Astro, Vue, Nuxt, React/Vite).
- Edits `dialex.config.ts` using Magicast AST transforms, injects `i18nPlugin()` into `vite.config.ts` for React and Vue projects, and registers the `dialex/nuxt` module in `nuxt.config.ts` for Nuxt projects.
- Writes a starter dictionary and TypeScript declaration file.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Option                          | Description                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next`, or `react` |
| `-d, --default-locale <locale>` | Default locale, e.g. `en`                                                                                        |
| `-l, --locales <locales>`       | Comma-separated locales, e.g. `en,tr`                                                                            |
| `-y, --yes`                     | Skip prompts and use defaults                                                                                    |
