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

## Native binary

On Linux, macOS and Windows (x64 and arm64) `dialex` and `dx` run a native binary built from Rust, installed with the package as an optional dependency (`@dialexjs/cli-<platform>`). `generate` and `check` are 25 to 40 times faster than the Node implementation on a project with 1,000 dictionaries, and produce the same files and output byte for byte.

The native binary reads dictionaries and the config from the syntax tree. When a command needs your project's code to run (a config that is not plain data, a `translate` provider, `runtime: true`, lazy loading, `--fix`, `--watch`), or is not implemented natively (`init`, `export`, `import`, `lock`, `translate`), it hands the whole command to the Node CLI, so nothing changes for you. Two environment variables control this:

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # native only: fail instead of falling back to Node
```

With npm and Yarn classic on Linux and macOS, the install step puts the binary where the launcher was, so `dx` starts in under a millisecond instead of booting Node first (about 25 ms). Other package managers, `--ignore-scripts`, and Windows keep a small JavaScript launcher that runs the same binary.
