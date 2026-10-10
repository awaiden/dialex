# @dialexjs/language-server

A [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) server for
[Dialex](https://github.com/awaiden/dialex) translations. Editors that speak LSP (Zed, Neovim,
Helix, Sublime and others) get Dialex's diagnostics and hover without a dedicated plugin.

> **Status: early.** Diagnostics and hover work. Go to definition, completion, quick fixes and
> automatic `dialex.generated.ts` updates are being added.

## Run it

```bash
npx @dialexjs/language-server --stdio
```

## What it does today

- **Diagnostics**: missing keys and locales in `.content.ts` dictionaries, `getDictionary("x")` and
  `t("x.y")` calls that point at nothing, invalid ICU messages, `[TODO]` placeholders, and
  translations whose source text changed since they were translated.
- **Hover**: hover a `t("home.title")` key or a dictionary name to see the text in every locale.

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
