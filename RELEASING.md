# Releasing

All four packages (`dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp`, the VS Code extension) share one
version. Releases use [Changesets](https://github.com/changesets/changesets) to decide the bump, plus
a small script (`scripts/release.mjs`) that keeps one root `CHANGELOG.md`.

## Describing a change

Add a changeset with the change itself:

```bash
bun run changeset
```

Pick `dialexjs` (the packages are versioned together), a bump (`patch` or `minor`; while the version
is 0.x, breaking changes are `minor`) and write the note. It is Markdown: several paragraphs, a table
or a migration guide all work. The file lands in `.changeset/`.

## Releasing

```bash
bun run release --dry-run   # which changesets, the planned version and the changelog entry
bun run release
```

`bun run release`:

1. checks that the working tree is clean, the package versions agree, `bun.lock` is current and there
   is at least one changeset;
2. runs `changeset version`, which picks the largest bump, bumps the packages and deletes the
   changeset files (the VS Code package is private, so the script keeps it on the same version);
3. adds the collected notes to `CHANGELOG.md` as `## [x.y.z] - date`, grouped into Major, Minor and
   Patch changes, with the compare link;
4. rebuilds `bun.lock`, regenerates the docs changelog pages and `llms*.txt`, and checks that it all
   agrees;
5. commits as `Release vX.Y.Z` and creates the tag. Use `--no-commit` to stop before that, and
   `--gate` to run `bun run ready` first.

Then push the branch, wait for CI, and push the tag:

```bash
git push origin main
git push origin v0.5.0
```

The Release workflow runs `node scripts/release.mjs --check <tag>`, publishes to npm with provenance
and creates the GitHub Release from the changelog section. Publishing does not use `changeset
publish`: the packages are packed with `bun pm pack` so `workspace:*` becomes a real version.

`bun.lock` is rebuilt, not just checked: `bun pm pack` writes dependency versions from it, and a stale
lock once published `@dialexjs/mcp` depending on an old `@dialexjs/cli`.
