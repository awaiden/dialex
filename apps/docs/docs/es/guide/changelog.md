# Registro de cambios

Qué cambió en cada versión de `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` y la extensión de VS Code. Las notas están escritas en inglés. Cada versión también aparece en [GitHub Releases](https://github.com/awaiden/dialex/releases).

All notable changes to Dialex are listed here. `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` and the VS Code extension share one version number.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/awaiden/dialex/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/awaiden/dialex/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/awaiden/dialex/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/awaiden/dialex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/awaiden/dialex/releases/tag/v0.1.0
