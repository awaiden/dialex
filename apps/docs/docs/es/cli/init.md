# dialex init

Inicializa Dialex en el proyecto actual.

- Detecta el framework (Next.js, Fastify, Koa, Hono, Express, NestJS, Elysia, SvelteKit, Astro, Vue, Nuxt, React/Vite).
- Edita `dialex.config.ts` mediante transformaciones AST de Magicast, inyecta `i18nPlugin()` en `vite.config.ts` en proyectos React y Vue, y registra el módulo `dialexjs/nuxt` en `nuxt.config.ts` en proyectos Nuxt.
- Escribe un diccionario inicial y un archivo de declaraciones de TypeScript.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Opción                          | Descripción                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next` o `react` |
| `-d, --default-locale <locale>` | Locale por defecto, p. ej. `en`                                                                                |
| `-l, --locales <locales>`       | Locales separados por comas, p. ej. `en,tr`                                                                    |
| `-y, --yes`                     | Omite las preguntas y usa los valores por defecto                                                              |
