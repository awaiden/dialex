# Changesets

Describe each user-facing change in a file here, as part of the change itself:

```bash
bun run changeset
```

Always include `dialexjs` (its `CHANGELOG.md` becomes the release notes) and any other package the change touches. Pick a bump (`patch`, `minor`; while the version is
0.x, breaking changes are `minor`) and write the note in Markdown. It can be several paragraphs,
a table, a migration guide. When changes reach `main`, a GitHub Action opens a "Version Packages" PR that
consumes these files. See [RELEASING.md](../RELEASING.md).
