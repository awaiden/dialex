# CLI

`@dialexjs/cli` installs two binaries: `dialex` and the shorter alias `dx`, which is handy in `package.json` scripts (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Command                                                      | Alias  | Purpose                                                       |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------- |
| [`dialex init`](./init.md)                                   |        | Scaffold Dialex in a project                                  |
| [`dialex generate`](./generate.md)                           | `gen`  | Compile dictionaries and type declarations                    |
| [`dialex check`](./check.md)                                 | `lint` | Verify locale parity and how code uses dictionaries           |
| [`dialex export`](./export.md)                               |        | Export strings as JSON, CSV or XLIFF for translators          |
| [`dialex import`](./import.md)                               |        | Write translated files back into dictionaries                 |
| [`dialex translate`](./translate.md)                         |        | Fill missing translations with a machine-translation provider |
| [`dialex lock`](./translate.md#keeping-translations-in-sync) |        | Record translations as up to date with their source           |

A typical workflow: `dialex check --fix` to create placeholders for new keys, then either `dialex translate` or `dialex export` / `dialex import` for human translators, then `dialex check` in CI.
