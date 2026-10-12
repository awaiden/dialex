# dialex init

Initialisiert Dialex im aktuellen Projekt.

- Erkennt das Framework (Next.js, React Router, React/Vite, Preact, Solid, Svelte, SvelteKit, Vue, Nuxt, Qwik, Lit, React Native, Astro, Hono, Express, Fastify, Koa, NestJS, Elysia, Hapi, AdonisJS, tRPC).
- Bearbeitet `dialex.config.ts` mit Magicast-AST-Transformationen (für jedes Framework wird eine Konfigurationsdatei angelegt) und registriert in Nuxt-Projekten das Modul `dialexjs/nuxt` in `nuxt.config.ts`.
- Schreibt ein Start-Wörterbuch und eine TypeScript-Deklarationsdatei.
- Fügt `dialexjs` und die Dev-Abhängigkeit `@dialexjs/cli` zur `package.json` hinzu (bereits aufgeführte Pakete bleiben unverändert) sowie ein Skript `dx:generate`. Führe danach den Install-Befehl deines Paketmanagers aus.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Option                          | Beschreibung                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next`, `svelte`, `solid`, `preact`, `qwik`, `lit`, `react-native`, `hapi`, `adonis`, `trpc`, `react-router` oder `react` |
| `-d, --default-locale <locale>` | Standard-Locale, z. B. `en`                                                                                                                                                                                             |
| `-l, --locales <locales>`       | Kommagetrennte Locales, z. B. `en,tr`                                                                                                                                                                                   |
| `-y, --yes`                     | Überspringt die Rückfragen und verwendet die Standardwerte                                                                                                                                                              |
| `--ai`                          | Richtet KI-Assistenten-Unterstützung ein: `.agents/skills/dialex/SKILL.md`, einen Eintrag `dialex` in `.mcp.json` und Dialex-Richtlinien in `AGENTS.md`. Mit `-y` ist es an, sofern du nicht `--no-ai` übergibst        |
| `--no-ai`                       | Überspringt die KI-Assistenten-Dateien                                                                                                                                                                                  |
