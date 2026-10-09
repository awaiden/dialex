# Releasing

All four packages (`dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp`, the VS Code extension) share one version.

1. While you work, describe changes under `## [Unreleased]` in `CHANGELOG.md`.
2. Run the release:

   ```bash
   bun run release
   ```

   This runs [`bumpp`](https://github.com/antfu-collective/bumpp) (configured in `bump.config.ts`):

   1. `scripts/release.mjs --preflight` stops early if the working tree is dirty, the package versions
      disagree, `bun.lock` is stale or `Unreleased` is empty.
   2. `bumpp` asks which version to release (patch, minor, major, prerelease or a custom one) and
      bumps the four `package.json` files.
   3. `scripts/release.mjs --prepare` moves the Unreleased entries under the new version (and fixes
      the compare links), rebuilds `bun.lock`, regenerates the docs changelog pages and `llms*.txt`,
      and checks that everything agrees.
   4. `bumpp` commits everything as `Release vX.Y.Z` and creates the tag. It does not push.

3. Push the branch, wait for CI, then push the tag:

   ```bash
   git push origin main
   git push origin v0.4.1
   ```

   The Release workflow runs `node scripts/release.mjs --check <tag>`, publishes to npm with provenance
   and creates the GitHub Release from the changelog section.

`bun.lock` is rebuilt, not just checked: `bun pm pack` writes dependency versions from it, and a stale
lock once published `@dialexjs/mcp` depending on an old `@dialexjs/cli`.
