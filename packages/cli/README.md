<p align="center">
  <img src="https://raw.githubusercontent.com/awaiden/dialex/main/assets/logo.png" alt="Dialex" width="96" height="96" />
</p>

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

Binaries installed: `dialex` and the shorter alias `dx` (handy in package.json scripts).

---

## 🛠️ Commands

### `dialex init`

Initialize or configure Dialex in any project:

- **Automatic Framework Detection**: Identifies Next.js, React Router, React/Vite, Preact, Solid, Svelte, SvelteKit, Vue, Nuxt, Qwik, Lit, React Native, Astro, Hono, Express, Fastify, Koa, NestJS, Elysia, Hapi, AdonisJS and tRPC from `package.json`.
- **Magicast AST Injection**: Manipulates `dialex.config.ts` and registers the module in `nuxt.config.ts` (Nuxt) cleanly.
- **Starter Dictionaries**: Emits typed starter dictionary and TypeScript declaration file.

```bash
# Interactive:
dialex init

# Headless / CI:
dialex init --framework fastify --default-locale en --locales en,tr -y
```

### `dialex generate` (alias: `gen`)

Compiles `.content.ts` dictionaries into static TypeScript modules for zero-overhead server execution:

- Outputs `src/dialex.generated.ts` (static dictionary map).
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

### `dialex lock`

Records the translations you have as up to date with their current source text (`dialex.lock.json`), so a later edit of the source is noticed. `dialex translate` and `dialex import` record what they write; `dialex check` warns about translations whose source changed, and `--fail-on-stale` makes that an error.

```bash
dialex lock
dialex lock --all   # also accept translations that are already out of date
```

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

## Exit codes

`0` on success; `1` when the command fails. `dialex check` exits with `1` when it finds errors (warnings never fail it). `dialex import` exits with `0` even when it rejected values; read `success` in its `--json` output. Every command except `init` accepts `--json`.

## Documentation

[Commands and options](https://dialex.awaiden.com/cli/) and the [diagnostics reference](https://dialex.awaiden.com/guide/diagnostics.html).

---

## 📝 Changelog

See what changed in each release in the [changelog](https://github.com/awaiden/dialex/blob/main/CHANGELOG.md), or on [GitHub Releases](https://github.com/awaiden/dialex/releases).

## 📄 License

MIT © [awaiden](https://github.com/awaiden)
