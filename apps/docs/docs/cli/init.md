# dialex init

Initializes Dialex in the current project.

- Detects the framework (Next.js, React Router, React/Vite, Preact, Solid, Svelte, SvelteKit, Vue, Nuxt, Qwik, Lit, React Native, Astro, Hono, Express, Fastify, Koa, NestJS, Elysia, Hapi, AdonisJS, tRPC).
- Edits `dialex.config.ts` using Magicast AST transforms (a config file is created for every framework) and registers the `dialexjs/nuxt` module in `nuxt.config.ts` for Nuxt projects.
- Writes a starter dictionary and TypeScript declaration file.
- Adds `dialexjs` and the `@dialexjs/cli` dev dependency to `package.json` (packages you already list are left alone) together with a `dx:generate` script. Run your package manager's install afterwards.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Option                          | Description                                                                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next`, `svelte`, `solid`, `preact`, `qwik`, `lit`, `react-native`, `hapi`, `adonis`, `trpc`, `react-router`, or `react` |
| `-d, --default-locale <locale>` | Default locale, e.g. `en`                                                                                                                                                                                              |
| `-l, --locales <locales>`       | Comma-separated locales, e.g. `en,tr`                                                                                                                                                                                  |
| `-y, --yes`                     | Skip prompts and use defaults                                                                                                                                                                                          |
| `--ai`                          | Configure AI assistant support: `.agents/skills/dialex/SKILL.md`, a `dialex` entry in `.mcp.json` and Dialex guidelines in `AGENTS.md`. With `-y` it is on unless you pass `--no-ai`                                   |
| `--no-ai`                       | Skip the AI assistant files                                                                                                                                                                                            |
