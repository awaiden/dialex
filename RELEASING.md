# Releasing

`dialexjs`, `@dialexjs/cli` and `@dialexjs/mcp` share one version and are released with
[Changesets](https://github.com/changesets/changesets). There is no release script: a GitHub Action
does the versioning and publishing. (The private VS Code extension has no changelog of its own; its `.vsix` is stamped with the core version when it is packaged.)

## Describing a change

Add a changeset with the change itself:

```bash
bun run changeset
```

Always include `dialexjs` (that package's `CHANGELOG.md` is the release notes), plus the other
packages the change touches. Pick a bump (`patch` or `minor`; while the version is 0.x, breaking
changes are `minor`) and write the note in Markdown: several paragraphs, a table or a migration guide
all work. The file lands in `.changeset/`.

## Versioning policy

Below 1.0 the API is not considered stable (it says so in the README and the docs). A breaking
change is a `minor` bump, never a `patch`; patch releases stay compatible. Describe what breaks and
how to migrate in the changeset, because that text becomes the release notes.

## Releasing

1. Merge changes (with their changesets) into `main`. The Release workflow opens or updates a
   **Version Packages** pull request: it bumps the versions, writes each package's `CHANGELOG.md`
   and rebuilds `bun.lock`.
2. Review that PR and merge it when you want to release.
3. The workflow runs again on `main`, finds nothing left to version, runs the full gate, and
   publishes every package that is not on npm yet (with provenance). Then, if the tag for the version in `packages/core/package.json` is missing, it creates the `vX.Y.Z` tag
   and the GitHub Release, using the section of `packages/core/CHANGELOG.md` as its notes.
   The packaged VS Code extension (`dialex-vscode-X.Y.Z.vsix`) is attached to that release as an asset.

The docs changelog page is built from `packages/core/CHANGELOG.md` (newer releases) and the root
`CHANGELOG.md` (history up to 0.4.0).

## Things to know

- Packing: `bun pm pack` writes the versions of workspace dependencies from `bun.lock`, which keeps
  the old ones after a bump. The workflow deletes and rebuilds `bun.lock` before packing and checks the
  tarball, so a package cannot depend on a stale release (0.2.0 did). `bun run changeset:version`
  does the same when it versions.
- The repository setting **Settings, Actions, General, "Allow GitHub Actions to create and approve
  pull requests"** must be on, or the Version Packages PR cannot be opened.
- `NPM_TOKEN` must be an Actions secret.

## Updating your own VS Code

After a release, `bun run vscode:install` downloads the latest `.vsix` from the GitHub Release and installs it into the local VS Code (`code --install-extension --force`). Reload the window afterwards.

## Publishing the Zed extension

The Zed extension (`packages/zed`) has its own version in `extension.toml` and is published through
a pull request to [`zed-industries/extensions`](https://github.com/zed-industries/extensions),
which pins a commit of this repository. It is not part of the Changesets release.

First submission, from a fork of that repository:

```bash
git submodule add https://github.com/awaiden/dialex.git extensions/dialex
```

and add this to its `extensions.toml`, then run `pnpm sort-extensions` and open the pull request:

```toml
[dialex]
submodule = "extensions/dialex"
path = "packages/zed"
version = "0.1.0"
```

For an update, bump `version` in `packages/zed/extension.toml` and `Cargo.toml`, merge it, then
open a pull request that moves the submodule to the new commit and sets the same `version`.
The server itself (`@dialexjs/language-server`) updates through npm; the extension installs the
latest version on its own.
