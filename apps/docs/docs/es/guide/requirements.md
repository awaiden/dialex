# Requisitos

Lo que Dialex necesita de tu entorno y lo que te pide instalar a ti.

## Runtime y herramientas

| Requisito             | Qué necesita Dialex                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formato de módulo     | Los paquetes son **solo módulos ES** (`"type": "module"`, archivos `.mjs`). Impórtalos desde ESM, un bundler o con `import()` en CommonJS                                                        |
| Node.js               | No se declara el campo `engines`. La suite de pruebas y la CI se ejecutan en Node.js 22; las herramientas del propio repositorio necesitan 22.18 o posterior. Usa una LTS actual                 |
| Otros runtimes        | El núcleo del runtime y el manejador de la API Fetch solo usan APIs estándar (`Intl`, `Request`, `Headers`, `Map`), así que funcionan donde existan: Bun, Deno, Cloudflare Workers y navegadores |
| TypeScript            | Un 5.x actual o posterior. Los tipos usan tipos de plantilla literal y condicionales. El repositorio comprueba tipos con TypeScript 7                                                            |
| Resolución de módulos | `compilerOptions.moduleResolution` debe ser `"bundler"`, `"node16"` o `"nodenext"`. Las importaciones por subruta (`dialexjs/react`) son entradas de `exports`, que el antiguo `"node"` no lee   |
| Gestor de paquetes    | npm, Yarn, pnpm y Bun funcionan. El binario nativo de la CLI se instala como dependencia opcional, así que no uses `--no-optional` si lo quieres (consulta [Binarios nativos](./native.md))      |

## Paquetes

| Paquete                     | Qué es                                                    | Dependencias                                             |
| --------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `dialexjs`                  | El runtime y todos los adaptadores de framework           | Ninguna. Los frameworks son dependencias peer opcionales |
| `@dialexjs/cli`             | `dialex` / `dx`. Instálalo como dependencia de desarrollo | Instala sus propias herramientas; necesita `dialexjs`    |
| `@dialexjs/language-server` | El servidor LSP para Zed y otros editores                 | `@dialexjs/cli`                                          |
| `@dialexjs/mcp`             | El servidor MCP para asistentes de IA                     | `@dialexjs/cli`                                          |

## Versiones de framework

Los frameworks son **dependencias peer opcionales** de `dialexjs`: instala solo los que uses. Estas son las versiones que declaran los adaptadores:

| Adaptador                                               | Dependencia peer                 | Rango                 |
| ------------------------------------------------------- | -------------------------------- | --------------------- |
| `dialexjs/react`, `react-native`, `next/*` (con `next`) | `react`                          | `>=19.0.0`            |
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

`dialexjs/sveltekit`, `dialexjs/trpc`, `dialexjs/web`, `dialexjs/routing`, `dialexjs/icu`, `dialexjs/server` y `dialexjs/testing` no necesitan paquete de framework: usan tipos estructurales o `Request` estándar. React Native usa `react`; `expo-localization` y AsyncStorage de Expo son lo que tú pasas, no dependencias peer.

## Editores

| Editor             | Qué necesitas                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| VS Code            | La extensión de Dialex (un `.vsix` adjunto a cada release de GitHub). Consulta [VS Code](./vscode.md)                       |
| Zed                | La extensión de Dialex; inicia `@dialexjs/language-server`, que necesita Node.js. Consulta [Zed y otros editores](./zed.md) |
| Cualquiera con LSP | `@dialexjs/language-server`, iniciado con `--stdio`                                                                         |

## Comprueba tu configuración

```bash
node --version            # a current LTS
npx dialex --version      # the CLI, once installed
npx dialex check          # parity, ICU, references and a stale generated file
```
