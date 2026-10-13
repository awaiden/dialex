# Contributing

Dialex is a Bun workspace. You need Bun 1.4.2 or newer.

```bash
bun install
bun run ready   # format check, lint, types, tests, builds, docs checks
```

## Where things are

| Path                           | What lives there                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/core`       | The runtime shared by every adapter: config and registry types, `t()`, formatting, locale resolution, the dictionary store and `icu/` |
| `packages/core/src/client`     | Client framework adapters (`dialexjs/react`, `vue`, `svelte`, ...)                                                                    |
| `packages/core/src/server`     | Server adapters (`dialexjs/express`, `hono`, `nestjs`, ...) and `createDialexServer`                                                  |
| `packages/cli/src/analysis`    | Project analysis shared by `dialex check`, the editors and the lint rules                                                             |
| `packages/cli/src/commands`    | One folder per larger command (`init`, `generate`, `check`, `import`), a file for the small ones                                      |
| `packages/cli/src/utils`       | Dictionary editing (`dictionary/`), config reading, scanning, lock file                                                               |
| `packages/language-server/src` | `features/` are LSP-free functions; `server/` wires them to the protocol                                                              |
| `packages/mcp/src/tools`       | One file per MCP tool                                                                                                                 |
| `packages/vscode/src`          | The extension: `providers/` for hover, definition, completion and quick fixes                                                         |

A public import path such as `dialexjs/react` is decided by the entry list in `packages/core/vite.config.ts`, not by where the file is, so moving a source file does not change it.

## Making a change

1. Branch from `main` and make the change, with tests.
2. If it changes `dialexjs`, `@dialexjs/cli` or `@dialexjs/mcp`, add a changeset: `bun run changeset`.
   Always include `dialexjs`; its changelog is the release notes. Skip it for docs, examples and
   internal changes. Pull requests that change a published package fail CI without one (use `bun run changeset --empty` when none is needed).
3. Docs live in `apps/docs/docs` in five languages. Run `bun run docs:check-translations` after
   editing; the translated pages must keep the same structure as the English ones.
4. Run `bun run ready` before opening the pull request.

Releases are automated, see [RELEASING.md](RELEASING.md).

## AI assistance

This project is developed with AI assistance (Claude Code), and contributions made the same way are welcome. Hold them to the same bar as any other change: you are responsible for what you submit, it must pass `bun run ready`, and it should come with tests. Mention the tool in the commit with a `Co-Authored-By` trailer.
