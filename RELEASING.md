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

Push to `main`. The Release workflow does the rest in one run, with no pull request:

1. If changesets are pending, it bumps the versions, writes each package's `CHANGELOG.md` and
   rebuilds `bun.lock`, and commits that as **Version Packages** (kept local for now).
2. It runs the full gate (`bun run ready`) and the packed-package smoke test. If either fails
   nothing is pushed and nothing is published.
3. It pushes the version commit to `main`, then publishes every package that is not on npm yet
   (with provenance).
4. If the tag for the version in `packages/core/package.json` is missing, it creates the `vX.Y.Z`
   tag and the GitHub Release, using the section of `packages/core/CHANGELOG.md` as its notes. The
   packaged VS Code extension (`dialex-vscode-X.Y.Z.vsix`) is attached as an asset.
5. For a version commit it starts the docs build (a push made with the workflow token does not).

A push without changesets (docs, refactors, internal changes) publishes nothing new: the packages
are already on npm, so the run only verifies. If a run fails after the version commit was pushed,
re-run it: it publishes what is still missing.

The docs changelog page is built from `packages/core/CHANGELOG.md` (newer releases) and the root
`CHANGELOG.md` (history up to 0.4.0).

## Things to know

- Packing: `bun pm pack` writes the versions of workspace dependencies from `bun.lock`, which keeps
  the old ones after a bump. The workflow deletes and rebuilds `bun.lock` before packing and checks the
  tarball, so a package cannot depend on a stale release (0.2.0 did). `bun run changeset:version`
  does the same when it versions.
- The workflow pushes to `main` with `GITHUB_TOKEN`, so `main` must not require pull requests or
  status checks for that push.
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
