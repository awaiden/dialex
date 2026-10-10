# @dialexjs/language-server

A [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) server for
[Dialex](https://github.com/awaiden/dialex) translations. Editors that speak LSP (Zed, Neovim,
Helix, Sublime and others) get Dialex's diagnostics and hover without a dedicated plugin.

> **Status: early.** Everything below works; it has been tested against an LSP client, and the
> Zed extension is next.

## Run it

```bash
npx @dialexjs/language-server --stdio
```

## What it does today

- **Diagnostics**: missing keys and locales in `.content.ts` dictionaries, `getDictionary("x")` and
  `t("x.y")` calls that point at nothing, invalid ICU messages, `[TODO]` placeholders, and
  translations whose source text changed since they were translated.
- **Hover**: hover a `t("home.title")` key or a dictionary name to see the text in every locale.
- **Go to definition**: jump from a key to where the dictionary writes it.
- **Completion**: dictionary names and key paths inside `t("…")`, `getDictionary("…")` and
  `useDictionary("…")`, triggered by `"`, `'`, `` ` `` and `.`.
- **Quick fixes**: copy a missing key into a locale (marked `[TODO]`), add every missing key in a
  file, or create a key that code refers to.

- **Generated files**: when a dictionary or config file is added, changed or removed, in a project
  that already has a `dialex.generated.ts`, the server regenerates it and `dialex-env.d.ts`. It
  uses the editor's file events when the client sends them and watches the disk itself otherwise.
  It never creates a generated file in a project that has none; run `dx generate` once for that.

It reads configs and dictionaries from the syntax tree and **never runs your project's code**.

## Settings

Sent under the `dialex` section (`workspace/configuration`):

| Setting      | Default | Description                                                             |
| ------------ | ------- | ----------------------------------------------------------------------- |
| `enable`     | `true`  | Turn all features off                                                   |
| `unusedKeys` | `false` | Fade out keys and dictionaries that no source file seems to use         |
| `configPath` | —       | Config file relative to each project root; empty uses `dialex.config.*` |

## Library use

The editor-independent building blocks (project model, reference lookup, hover text, completion
entries, quick-fix edits, project discovery) are exported from `@dialexjs/language-server/features`.
The VS Code extension uses them too.
