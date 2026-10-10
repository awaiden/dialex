# Contributing

Dialex is a Bun workspace. You need Bun 1.4.2 or newer.

```bash
bun install
bun run ready   # format check, lint, types, tests, builds, docs checks
```

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
