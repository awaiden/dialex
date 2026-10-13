# Voraussetzungen

Was Dialex von deiner Umgebung braucht und was es dich selbst installieren lässt.

## Laufzeit und Werkzeuge

| Voraussetzung     | Was Dialex braucht                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modulformat       | Die Pakete sind **nur ES-Module** (`"type": "module"`, `.mjs`-Dateien). Importiere sie aus ESM, einem Bundler oder per `import()` in CommonJS                                                         |
| Node.js           | Es ist kein Feld `engines` deklariert. Die Testsuite und die CI laufen auf Node.js 22; das eigene Tooling des Repositorys braucht 22.18 oder neuer. Nimm ein aktuelles LTS-Release                    |
| Andere Laufzeiten | Der Laufzeitkern und der Fetch-API-Handler nutzen nur Standard-APIs (`Intl`, `Request`, `Headers`, `Map`) und laufen daher überall, wo es sie gibt: Bun, Deno, Cloudflare Workers und Browser         |
| TypeScript        | Ein aktuelles 5.x oder neuer. Die Typen verwenden Template-Literal- und konditionale Typen. Das Repository prüft die Typen mit TypeScript 7                                                           |
| Modulauflösung    | `compilerOptions.moduleResolution` muss `"bundler"`, `"node16"` oder `"nodenext"` sein. Die Subpfad-Importe (`dialexjs/react`) sind `exports`-Einträge, die die alte Einstellung `"node"` nicht liest |
| Paketmanager      | npm, Yarn, pnpm und Bun funktionieren alle.                                                                                                                                                           |

## Pakete

| Paket                       | Was es ist                                         | Abhängigkeiten                                       |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `dialexjs`                  | Die Laufzeit und jeder Framework-Adapter           | Keine. Frameworks sind optionale Peer-Abhängigkeiten |
| `@dialexjs/cli`             | `dialex` / `dx`. Als Dev-Abhängigkeit installieren | Bringt sein eigenes Tooling mit; braucht `dialexjs`  |
| `@dialexjs/language-server` | Der LSP-Server für Zed und andere Editoren         | `@dialexjs/cli`                                      |
| `@dialexjs/mcp`             | Der MCP-Server für KI-Assistenten                  | `@dialexjs/cli`                                      |

## Framework-Versionen

Frameworks sind **optionale Peer-Abhängigkeiten** von `dialexjs`: Installiere nur die, die du nutzt. Diese Versionen deklarieren die Adapter:

| Adapter                                                 | Peer-Abhängigkeit                | Bereich               |
| ------------------------------------------------------- | -------------------------------- | --------------------- |
| `dialexjs/react`, `react-native`, `next/*` (mit `next`) | `react`                          | `>=19.0.0`            |
| `dialexjs/next/middleware`, `next/link`                 | `next`                           | `>=13.0.0`            |
| `dialexjs/preact`                                       | `preact`                         | `>=10.0.0`            |
| `dialexjs/solid`                                        | `solid-js`                       | `^1.8.0`              |
| `dialexjs/vue`                                          | `vue`                            | `^3.4.0`              |
| `dialexjs/nuxt`                                         | `@nuxt/kit`                      | `>=3.0.0`             |
| `dialexjs/svelte`                                       | `svelte`                         | `^4.0.0 \|\| ^5.0.0`  |
| `dialexjs/qwik`                                         | `@builder.io/qwik`               | `>=1.5.0 <2`          |
| `dialexjs/lit`                                          | `lit`                            | `^3.0.0`              |
| `dialexjs/angular`                                      | `@angular/core`, `rxjs`          | `>=17.0.0`, `>=7.0.0` |
| `dialexjs/express`                                      | `express`                        | `>=4.0.0`             |
| `dialexjs/fastify`                                      | `fastify`                        | `>=4.0.0`             |
| `dialexjs/koa`                                          | `koa`                            | `>=2.0.0`             |
| `dialexjs/hono`                                         | `hono`                           | `>=3.0.0`             |
| `dialexjs/elysia`                                       | `elysia`                         | `>=1.0.0`             |
| `dialexjs/nestjs`                                       | `@nestjs/common`, `@nestjs/core` | `>=10.0.0`            |
| `dialexjs/hapi`                                         | `@hapi/hapi`                     | `>=21.0.0`            |
| `dialexjs/adonis`                                       | `@adonisjs/http-server`          | `>=7.0.0`             |
| `dialexjs/h3`                                           | `h3`                             | `>=1.8.0 <2`          |
| `dialexjs/astro`                                        | `astro`                          | `>=4.0.0`             |

`dialexjs/sveltekit`, `dialexjs/trpc`, `dialexjs/web`, `dialexjs/routing`, `dialexjs/icu`, `dialexjs/server` und `dialexjs/testing` brauchen kein Framework-Paket: Sie nutzen strukturelle Typen oder Standard-`Request`s. React Native nutzt `react`; `expo-localization` und AsyncStorage von Expo übergibst du, sie sind keine Peer-Abhängigkeiten.

## Editoren

| Editor        | Was du brauchst                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| VS Code       | Die Dialex-Erweiterung (eine `.vsix` an jedem GitHub-Release). Siehe [VS Code](./vscode.md)                                     |
| Zed           | Die Dialex-Erweiterung; sie startet `@dialexjs/language-server`, das Node.js braucht. Siehe [Zed und andere Editoren](./zed.md) |
| Alles mit LSP | `@dialexjs/language-server`, gestartet mit `--stdio`                                                                            |

## Dein Setup prüfen

```bash
node --version            # a current LTS
npx dialex --version      # the CLI, once installed
npx dialex check          # parity, ICU, references and a stale generated file
```
