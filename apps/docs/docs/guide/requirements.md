# Requirements

What Dialex needs from your environment, and what it asks you to install yourself.

## Runtime and tooling

| Requirement       | What Dialex needs                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module format     | The packages are **ES modules only** (`"type": "module"`, `.mjs` files). Import them from ESM, a bundler, or `import()` in CommonJS                                                            |
| Node.js           | No `engines` field is declared. The test suite and the CI run on Node.js 22; the repository's own tooling needs 22.18 or later. Use a current LTS release                                      |
| Other runtimes    | The runtime core and the Fetch API handler use only standard APIs (`Intl`, `Request`, `Headers`, `Map`), so they run where those exist: Bun, Deno, Cloudflare Workers and browsers             |
| TypeScript        | A current 5.x or later. The types use template literal and conditional types. The repository type-checks with TypeScript 7                                                                     |
| Module resolution | `compilerOptions.moduleResolution` must be `"bundler"`, `"node16"` or `"nodenext"`. The subpath imports (`dialexjs/react`) are `exports` entries, which the old `"node"` setting does not read |
| Package manager   | npm, Yarn, pnpm and Bun all work.                                                                                                                                                              |

## Packages

| Package                     | What it is                                        | Dependencies                                    |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `dialexjs`                  | The runtime and every framework adapter           | None. Frameworks are optional peer dependencies |
| `@dialexjs/cli`             | `dialex` / `dx`. Install as a dev dependency      | Installs its own tooling; needs `dialexjs`      |
| `@dialexjs/eslint-plugin`   | ESLint and oxlint rules for dictionaries and keys | `@dialexjs/cli`                                 |
| `@dialexjs/language-server` | The LSP server for Zed and other editors          | `@dialexjs/cli`                                 |
| `@dialexjs/mcp`             | The MCP server for AI assistants                  | `@dialexjs/cli`                                 |

## Framework versions

Frameworks are **optional peer dependencies** of `dialexjs`: install only the ones you use. These are the versions the adapters declare:

| Adapter                                                  | Peer dependency                  | Range                 |
| -------------------------------------------------------- | -------------------------------- | --------------------- |
| `dialexjs/react`, `react-native`, `next/*` (with `next`) | `react`                          | `>=19.0.0`            |
| `dialexjs/next/middleware`, `next/link`                  | `next`                           | `>=13.0.0`            |
| `dialexjs/preact`                                        | `preact`                         | `>=10.0.0`            |
| `dialexjs/solid`                                         | `solid-js`                       | `^1.8.0`              |
| `dialexjs/vue`                                           | `vue`                            | `^3.4.0`              |
| `dialexjs/nuxt`                                          | `@nuxt/kit`                      | `>=3.0.0`             |
| `dialexjs/svelte`                                        | `svelte`                         | `^4.0.0 \|\| ^5.0.0`  |
| `dialexjs/qwik`                                          | `@builder.io/qwik`               | `>=1.5.0 <2`          |
| `dialexjs/lit`                                           | `lit`                            | `^3.0.0`              |
| `dialexjs/angular`                                       | `@angular/core`, `rxjs`          | `>=17.0.0`, `>=7.0.0` |
| `dialexjs/express`                                       | `express`                        | `>=4.0.0`             |
| `dialexjs/fastify`                                       | `fastify`                        | `>=4.0.0`             |
| `dialexjs/koa`                                           | `koa`                            | `>=2.0.0`             |
| `dialexjs/hono`                                          | `hono`                           | `>=3.0.0`             |
| `dialexjs/elysia`                                        | `elysia`                         | `>=1.0.0`             |
| `dialexjs/nestjs`                                        | `@nestjs/common`, `@nestjs/core` | `>=10.0.0`            |
| `dialexjs/hapi`                                          | `@hapi/hapi`                     | `>=21.0.0`            |
| `dialexjs/adonis`                                        | `@adonisjs/http-server`          | `>=7.0.0`             |
| `dialexjs/h3`                                            | `h3`                             | `>=1.8.0 <2`          |
| `dialexjs/astro`                                         | `astro`                          | `>=4.0.0`             |

`dialexjs/sveltekit`, `dialexjs/trpc`, `dialexjs/web`, `dialexjs/routing`, `dialexjs/icu`, `dialexjs/server` and `dialexjs/testing` need no framework package: they use structural types or standard `Request`s. React Native uses `react`; Expo's `expo-localization` and AsyncStorage are what you pass in, not peer dependencies.

## Editors

| Editor            | What you need                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| VS Code           | The Dialex extension (a `.vsix` attached to each GitHub release). See [VS Code](./vscode.md)                            |
| Zed               | The Dialex extension; it starts `@dialexjs/language-server`, which needs Node.js. See [Zed and other editors](./zed.md) |
| Anything with LSP | `@dialexjs/language-server`, started with `--stdio`                                                                     |

## Check your setup

```bash
node --version            # a current LTS
npx dialex --version      # the CLI, once installed
npx dialex check          # parity, ICU, references and a stale generated file
```
