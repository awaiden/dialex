# dialex init

Initialisiert Dialex im aktuellen Projekt.

- Erkennt das Framework (Next.js, Fastify, Koa, Hono, Express, NestJS, Elysia, SvelteKit, Astro, Vue, Nuxt, React/Vite).
- Bearbeitet `dialex.config.ts` mit AST-Transformationen von Magicast, fügt in React- und Vue-Projekten `i18nPlugin()` in `vite.config.ts` ein und registriert in Nuxt-Projekten das Modul `dialexjs/nuxt` in `nuxt.config.ts`.
- Schreibt ein Start-Wörterbuch und eine TypeScript-Deklarationsdatei.
- Fügt `dialexjs` und die Dev-Abhängigkeit `@dialexjs/cli` zur `package.json` hinzu (bereits aufgeführte Pakete bleiben unverändert) sowie ein Skript `dx:generate`. Führe danach den Install-Befehl deines Paketmanagers aus.

```bash
dialex init                                  # interactive
dialex init --framework fastify --default-locale en --locales en,tr -y
```

| Option                          | Beschreibung                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `-f, --framework <framework>`   | `hono`, `express`, `fastify`, `koa`, `nestjs`, `elysia`, `sveltekit`, `astro`, `vue`, `nuxt`, `next` oder `react` |
| `-d, --default-locale <locale>` | Standard-Locale, z. B. `en`                                                                                       |
| `-l, --locales <locales>`       | Kommagetrennte Locales, z. B. `en,tr`                                                                             |
| `-y, --yes`                     | Überspringt die Rückfragen und verwendet die Standardwerte                                                        |
