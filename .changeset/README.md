# Changesets

Describe each user-facing change in a file here, as part of the change itself:

```bash
bun run changeset
```

Pick `dialexjs` (the packages share one version), a bump (`patch`, `minor`; while the version is
0.x, breaking changes are `minor`) and write the note in Markdown. It can be several paragraphs,
a table, a migration guide. `bun run release` collects these files into `CHANGELOG.md`, bumps the
versions and deletes them. See [RELEASING.md](../RELEASING.md).
