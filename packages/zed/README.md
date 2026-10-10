# Dialex for Zed

Editor support for [Dialex](https://github.com/awaiden/dialex) translations in
[Zed](https://zed.dev): diagnostics, hover, go to definition, completion and quick fixes.

Zed extensions cannot draw diagnostics or hovers themselves, so this extension only finds and
starts the [`@dialexjs/language-server`](../language-server) package. All the features live there.

## How it finds the server

In order:

1. `lsp.dialex.binary.path` from your Zed settings.
2. `@dialexjs/language-server` installed in your project (`package.json` dependency).
3. `dialex-language-server` on your `PATH`.
4. A copy the extension installs and updates itself with npm.

The server only starts in projects that look like Dialex projects: a `dialex.config.*` file, or
`dialexjs` / `@dialexjs/cli` in `package.json`.

## Settings

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

If the server is not started for TypeScript files, add it to the language's server list:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## Develop it

You need Rust with the `wasm32-wasip2` target (`rustup target add wasm32-wasip2`).

```bash
cd packages/zed
cargo build --release --target wasm32-wasip2   # checks that it compiles
```

To install it into your local Zed without the dialog, run `bun run zed:install` from the repository
root (it builds the extension and copies it to Zed's `extensions/installed/dialex`), then restart
Zed. Or, in Zed, run **zed: install dev extension** and pick this folder. `zed: open log` (or
`zed --foreground`) shows the server's output.
