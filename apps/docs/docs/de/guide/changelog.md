# Änderungsprotokoll

Was sich in jeder Version von `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` und der VS-Code-Erweiterung geändert hat. Die Notizen sind auf Englisch verfasst. Jede Version erscheint außerdem auf [GitHub Releases](https://github.com/awaiden/dialex/releases).

All notable changes to Dialex are listed here. `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` and the VS Code extension share one version number.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `examples/tanstack`: a TanStack Start (React, SSR) app with server-side locale detection, ICU plurals and a language switch.

### Fixed

- `dialexjs/vite` under server-side rendering (reported with TanStack Start). Importing `dialexjs/react` in SSR failed with a `virtual:` import error until you set `ssr.noExternal` yourself; the plugin now sets `ssr.noExternal` and `optimizeDeps.exclude` for `dialexjs`.
- The dev server could hang and run out of memory (a 4 GB heap crash in a clean project). The dictionaries module no longer uses `import.meta.glob`; it imports the files the plugin finds with the same glob the CLI uses. `include` may now start with `/` or `./`, and `dist` and `.next` are ignored like in the CLI. New dictionary files are picked up while the dev server runs.
- Server adapters (`web`, `hono`, `express`, `koa`, `fastify`, `elysia`, `astro`, `h3`, `nestjs`, `sveltekit`) imported the project scanner (`fast-glob`, `unconfig`, `node:fs`) even when you pass `dictionaries`, which pulled those packages into SSR bundles. The scanner now loads only when no `dictionaries` are given.

## [0.3.0] - 2026-10-09

### Changed

- **Breaking:** every public name that started with `I18n` or `i18n` now starts with `Dialex` or `dialex`. The old names are gone, with no aliases. Rename imports as follows:

  | Before                                                                           | After                                                                                    |
  | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
  | `I18nConfig`, `resolveI18nConfig`                                                | `DialexConfig`, `resolveDialexConfig`                                                    |
  | `i18n()` in `dialexjs/hono`, `express`, `koa`, `elysia`, `astro`, `h3`           | `dialex()`                                                                               |
  | `i18nPlugin` (`dialexjs/vite`, `dialexjs/fastify`), `withI18n` (`dialexjs/next`) | `dialexPlugin`, `withDialex`                                                             |
  | `I18nProvider`, `useI18n`, `createI18n`, `I18nLink`, `I18nContext` (Vue)         | `DialexProvider`, `useDialex`, `createDialex`, `DialexLink`, `DialexContext`             |
  | `I18nModule`, `I18nService`, `I18nInterceptor`, `I18nMiddleware`, `injectI18n`   | `DialexModule`, `DialexService`, `DialexInterceptor`, `DialexMiddleware`, `injectDialex` |
  | `i18nHandle` (`dialexjs/sveltekit`), `resolveI18n` (`dialexjs/web`)              | `dialexHandle`, `resolveDialex`                                                          |
  | `createTestI18n`, `TestI18nProvider` (`dialexjs/testing`)                        | `createTestDialex`, `TestDialexProvider`                                                 |
  | Option types such as `HonoI18nOptions`, `NestI18nOptions`, `NuxtI18nOptions`     | `HonoDialexOptions`, `NestDialexOptions`, `NuxtDialexOptions`                            |

  Anything else with `I18n` in its name follows the same rule. A project that still has `i18n.config.ts` keeps working.

- `dialex export` writes to `dialex-export` by default instead of `i18n-export`.

### Added

- `dialex init` adds `dialexjs` and `@dialexjs/cli` to `package.json` (at the CLI's own version; packages you already list are left alone) and tells you which install command to run.

## [0.2.3] - 2026-10-09

### Changed

- `dialex init --ai` writes the skill to `.agents/skills/dialex/SKILL.md`, the agent-neutral location, instead of `.claude/skills/`. Tools that only read `.claude/skills` (Claude Code) need a copy or symlink there; `npx skills add` can install it for them.

### Added

- This changelog, a Changelog page in the documentation (all five languages), and a GitHub Release for every version tag, created from the matching section of this file.

## [0.2.2] - 2026-10-09

### Added

- `dx` command, a shorter alias for `dialex`, handy in `package.json` scripts.

### Changed

- **Breaking:** `dialex generate` now writes `src/dialex.generated.ts` instead of `src/i18n.generated.ts`. Rename the file and update your `import dictionaries from "./dialex.generated.js"` lines.
- `dialex init` now adds a `dx:generate` script (running `dx generate`) instead of `i18n:generate`. Existing scripts are left alone.
- `dialex-env.d.ts` only augments the entry points your project uses (for example `dialexjs/express`, or `dialexjs/react` and `dialexjs/server` for Next.js), based on `package.json`. If nothing is recognised, every entry point is still augmented.

### Fixed

- `dialex-mcp` exited immediately when started through a symlink, which is how `npx @dialexjs/mcp` and `node_modules/.bin` start it.
- The docs named the binary `dialexjs`; it is `dialex`.

## [0.2.1] - 2026-10-09

### Fixed

- `@dialexjs/cli` and `@dialexjs/mcp` 0.2.0 depended on the previous `0.1.0` of their sibling packages, because the packing step read stale versions from `bun.lock`. `@dialexjs/mcp` could not start with a fresh install.

### Changed

- The release workflow now stops before publishing if the tag, the package versions and `bun.lock` disagree.

## [0.2.0] - 2026-10-08

### Added

- `@dialexjs/mcp`: an MCP server (`dialex-mcp`) with nine tools to read config, dictionaries and issues, find usages, and make safe edits. It never calls a translation provider.
- Agent skills for `npx skills add awaiden/dialex`: `dialex` and `dialex-translate`.
- `--json` on `generate`, `export`, `import` and `translate`, next to `check`.
- `dialex init --ai` writes the skill, an `.mcp.json` entry and an `AGENTS.md` snippet.
- `llms.txt` and `llms-full.txt` for the documentation site, and an "AI assistants & MCP" guide in all five languages.

### Known issues

- Fresh installs of `@dialexjs/mcp@0.2.0` fail to start. Use 0.2.1 or later.

## [0.1.0] - 2026-10-08

First release.

### Added

- `dialexjs`: type-safe dictionaries with `t("dictionary.key.path")`, ICU messages, fallbacks, routing helpers, lazy loading and a testing helper, with adapters for Next.js, React, Vue, Nuxt, Angular, Express, Fastify, Koa, Hono, Elysia, SvelteKit, Astro, NestJS, h3 and Fetch-API runtimes.
- `@dialexjs/cli`: `init`, `generate`, `check`, `export`, `import` and `translate`, plus a static programmatic API at `@dialexjs/cli/api`.
- Translation providers for Claude, OpenAI, Gemini and DeepL.
- A VS Code extension with diagnostics, hover, go to definition, completion and quick fixes.
- Documentation in English, Turkish, Spanish, German and Simplified Chinese.

[Unreleased]: https://github.com/awaiden/dialex/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/awaiden/dialex/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/awaiden/dialex/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/awaiden/dialex/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/awaiden/dialex/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/awaiden/dialex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/awaiden/dialex/releases/tag/v0.1.0
