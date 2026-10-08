# CLI

`@dialex/cli` installs two binaries: `dialex` and the alias `dx`.

```bash
npm install -D @dialex/cli dialex
npm install -g @dialex/cli   # or globally
```

| Command                              | Alias  | Purpose                                                       |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| [`dialex init`](./init.md)           |        | Scaffold Dialex in a project                                  |
| [`dialex generate`](./generate.md)   | `gen`  | Compile dictionaries and type declarations                    |
| [`dialex check`](./check.md)         | `lint` | Verify locale parity and how code uses dictionaries           |
| [`dialex export`](./export.md)       |        | Export strings as JSON, CSV or XLIFF for translators          |
| [`dialex import`](./import.md)       |        | Write translated files back into dictionaries                 |
| [`dialex translate`](./translate.md) |        | Fill missing translations with a machine-translation provider |

A typical workflow: `dialex check --fix` to create placeholders for new keys, then either `dialex translate` or `dialex export` / `dialex import` for human translators, then `dialex check` in CI.
