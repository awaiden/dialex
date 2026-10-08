# @dialexjs/cli

> High-performance CLI tool for Dialex internationalization (codegen, scaffolding, CI parity checking).

[![npm version](https://img.shields.io/npm/v/@dialexjs/cli.svg)](https://www.npmjs.com/package/@dialexjs/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

```bash
# Locally in project (Recommended)
npm install -D @dialexjs/cli dialexjs
bun add -d @dialexjs/cli dialexjs

# Or globally
npm install -g @dialexjs/cli
```

Binaries installed: `dialexjs` and alias `dx`.

---

## 🛠️ Commands

### `dialex init`

Initialize or configure Dialex in any project:

- **Automatic Framework Detection**: Identifies Next.js, Fastify, Koa, Hono, Express, NestJS, Elysia, SvelteKit, Astro, Vue, Nuxt, and React/Vite.
- **Magicast AST Injection**: Manipulates `dialex.config.ts` and injects Vite plugins into `vite.config.ts` (React, Vue) and the module into `nuxt.config.ts` (Nuxt) cleanly.
- **Starter Dictionaries**: Emits typed starter dictionary and TypeScript declaration file.

```bash
# Interactive:
dialex init

# Headless / CI:
dialex init --framework fastify --default-locale en --locales en,tr -y
```

### `dialex generate` (alias: `gen`)

Compiles `.content.ts` dictionaries into static TypeScript modules for zero-overhead server execution:

- Outputs `src/i18n.generated.ts` (static dictionary map).
- Outputs `src/dialex-env.d.ts` (type registry augmentation).
- **Watch Mode (`-w` / `--watch`)**: Continuously monitors dictionary changes and updates bundles instantaneously.

```bash
dialex generate
dialex generate --watch
```

### `dialex export` / `dialex import`

Round-trip strings with translators as JSON, CSV or XLIFF 1.2, without editing TypeScript.

```bash
dialex export -f xliff -o translations
dialex import translations/tr.xlf
```

### `dialex translate`

Fills missing (or `[TODO]`) strings with a provider you configure in `dialex.config.ts`. Built-in providers for Claude, OpenAI (ChatGPT), Gemini and DeepL are exported from `@dialexjs/cli/translate`. `--dry-run` lists what would be sent without calling anything.

### `dialex check` (alias: `lint`)

CI verification command:

- Checks translation parity across all registered locales.
- Detects missing keys or untracked locale entries (including nested keys).
- Flags `getDictionary("x")` / `t("x.y")` calls that point at nothing, and warns about possibly unused keys.
- `--fix` inserts missing keys marked `[TODO]`; `--json` and `--github` produce machine-readable output.
- Exits with code `1` on parity errors, ideal for pre-commit hooks and GitHub Actions.

```bash
dialex check
```

---

## 📄 License

MIT © [awaiden](https://github.com/awaiden)
