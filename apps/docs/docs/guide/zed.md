# Zed and other editors

Dialex has a language server, [`@dialexjs/language-server`](https://www.npmjs.com/package/@dialexjs/language-server), that speaks the Language Server Protocol. Editors that support it get Dialex's diagnostics, hover, go to definition, completion and quick fixes without a dedicated plugin. For Zed there is an extension that finds and starts it. The VS Code extension is described in [VS Code Extension](./vscode.md).

::: warning Status
The language server is tested against an LSP client, and the Zed extension builds, but it has **not been tried in a real Zed window yet** and is not in Zed's extension registry. Install it as a dev extension and report anything that looks wrong.
:::

## Zed

Install the extension from the repository (it is in `packages/zed`): run **zed: install dev extension** in Zed's command palette and pick that folder. It needs Rust with the `wasm32-wasip2` target.

The extension looks for the server in your project (`@dialexjs/language-server` in `package.json`), then on your `PATH`, and otherwise installs and updates its own copy with npm. It only starts in projects that have a `dialex.config.*` file or `dialexjs` in `package.json`.

Settings go under `lsp.dialex` in Zed's settings:

```json
{
  "lsp": {
    "dialex": {
      "settings": {
        "unusedKeys": false,
        "autoGenerate": true,
        "configPath": ""
      }
    }
  }
}
```

If the server does not start for TypeScript files, add it to the language's server list:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## Other editors

Any LSP client can run the server over stdio:

```bash
npx @dialexjs/language-server --stdio
```

Neovim 0.11 or newer:

```lua
vim.lsp.config("dialex", {
  cmd = { "npx", "@dialexjs/language-server", "--stdio" },
  filetypes = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  root_markers = { "dialex.config.ts", "package.json" },
})
vim.lsp.enable("dialex")
```

Helix, in `languages.toml`:

```toml
[language-server.dialex]
command = "npx"
args = ["@dialexjs/language-server", "--stdio"]

[[language]]
name = "typescript"
language-servers = ["typescript-language-server", "dialex"]
```

::: warning Untested recipes
These two snippets follow each editor's documented configuration but have not been run against the real editors. Check them against your version's documentation.
:::

## Features

The server provides:

| Feature          | What you get                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostics      | Missing keys and locales, invalid [ICU](./icu.md), `[TODO]` placeholders, stale translations, and `getDictionary("x")` or `t("x.y")` calls that point at nothing |
| Hover            | The text of a key in every locale                                                                                                                                |
| Go to definition | Jumps to where the dictionary writes the key                                                                                                                     |
| Completion       | Dictionary names and key paths inside `t("...")` and `getDictionary("...")`                                                                                      |
| Quick fixes      | Copy a missing key into a locale (marked `[TODO]`), add all missing keys, or create a key that code refers to                                                    |
| Generated files  | Regenerates `dialex.generated.ts` when a dictionary or config file changes, in projects that already have one                                                    |

## Settings

The server reads these from the `dialex` section of the editor's configuration:

| Setting        | Default | Description                                                             |
| -------------- | ------- | ----------------------------------------------------------------------- |
| `enable`       | `true`  | Turn all features off                                                   |
| `unusedKeys`   | `false` | Fade out keys and dictionaries that no source file seems to use         |
| `autoGenerate` | `true`  | Regenerate `dialex.generated.ts` when dictionaries or the config change |
| `configPath`   | —       | Config file relative to each project root; empty uses `dialex.config.*` |

## Limits

- Dictionaries and configs are read from the syntax tree, so the server never runs your project's code. Dictionaries built with spreads or computed keys cannot be analyzed and show an informational note; run `dialex check` for those.
- Generated files are only updated in projects that already have one. Run `dialex generate` once to create it.
- There are no editor commands: regeneration is automatic.
