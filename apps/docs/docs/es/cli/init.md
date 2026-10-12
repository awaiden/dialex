# dialex init

Inicializa Dialex en el proyecto actual.

- Detecta el framework (Next.js, React Router, React/Vite, Preact, Solid, Svelte, SvelteKit, Vue, Nuxt, Qwik, Lit, React Native, Astro, Hono, Express, Fastify, Koa, NestJS, Elysia, Hapi, AdonisJS, tRPC).
- Edita `dialex.config.ts` con transformaciones AST de Magicast (se crea un archivo de configuración para cualquier framework) y registra el módulo `dialexjs/nuxt` en `nuxt.config.ts` en los proyectos Nuxt.
- Escribe un diccionario inicial y un archivo de declaraciones de TypeScript.
- Añade `dialexjs` y la dependencia de desarrollo `@dialexjs/cli` a `package.json` (los paquetes que ya figuran se dejan como están) junto con un script `dx:generate`. Después ejecuta el comando install de tu gestor de paquetes.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Opción                          | Descripción                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next`, `svelte`, `solid`, `preact`, `qwik`, `lit`, `react-native`, `hapi`, `adonis`, `trpc`, `react-router` o `react` |
| `-d, --default-locale <locale>` | Locale por defecto, p. ej. `en`                                                                                                                                                                                      |
| `-l, --locales <locales>`       | Locales separados por comas, p. ej. `en,tr`                                                                                                                                                                          |
| `-y, --yes`                     | Omite las preguntas y usa los valores por defecto                                                                                                                                                                    |
| `--ai`                          | Configura el soporte para asistentes de IA: `.agents/skills/dialex/SKILL.md`, una entrada `dialex` en `.mcp.json` y las pautas de Dialex en `AGENTS.md`. Con `-y` está activado salvo que pases `--no-ai`            |
| `--no-ai`                       | Omite los archivos de asistentes de IA                                                                                                                                                                               |
