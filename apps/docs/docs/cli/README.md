# CLI

`@dialexjs/cli` installs two binaries: `dialex` and the shorter alias `dx`, which is handy in `package.json` scripts (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Command                              | Alias  | Purpose                                                       |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| [`dialex init`](./init.md)           |        | Scaffold Dialex in a project                                  |
| [`dialex generate`](./generate.md)   | `gen`  | Compile dictionaries and type declarations                    |
| [`dialex check`](./check.md)         | `lint` | Verify locale parity and how code uses dictionaries           |
| [`dialex export`](./export.md)       |        | Export strings as JSON, CSV or XLIFF for translators          |
| [`dialex import`](./import.md)       |        | Write translated files back into dictionaries                 |
| [`dialex translate`](./translate.md) |        | Fill missing translations with a machine-translation provider |
| [`dialex lock`](./lock.md)           |        | Record translations as up to date with their source           |

A typical workflow: `dialex check --fix` to create placeholders for new keys, then either `dialex translate` or `dialex export` / `dialex import` for human translators, then `dialex check` in CI.

## Exit codes and JSON

| Command                                           | Exit code                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `generate`, `export`, `translate`, `lock`, `init` | `0` on success, `1` when the command fails (a syntax error, an unknown format, no provider...)         |
| `check`                                           | `1` when it finds errors; warnings never fail (`--fail-on-stale` turns stale translations into errors) |
| `import`                                          | `1` when it cannot run. It exits with `0` even when it rejected values; read `success` in the JSON     |

`generate`, `check`, `export`, `import`, `translate` and `lock` accept `--json`: they print one JSON object and nothing else, so another program can read it. The shape is on each command's page; for `check` see also the [diagnostics reference](../guide/diagnostics.md).
