# Native binaries

`dialex generate`, `dialex check` and the language server have a native implementation written in Rust. It reads the same dictionaries from their syntax tree and the config from `.dialex/config.json`, and produces **the same files and output byte for byte**; it is only faster. Every other command, and every case the native code cannot decide on its own, runs in the Node CLI as before. You never have to choose: install `@dialexjs/cli` and the right thing happens.

## Speed

Measured with best-of-5 fresh processes on one machine (an Intel Core i5-11400H); your numbers will differ, so run `apps/benchmarks/cli/run.mjs` to compare on your hardware.

| Project            | Command    | Node CLI | Native binary |
| ------------------ | ---------- | -------: | ------------: |
| 100 dictionaries   | `generate` |   341 ms |        4.3 ms |
| 100 dictionaries   | `check`    |   492 ms |        8.9 ms |
| 1,000 dictionaries | `generate` | 1,107 ms |         28 ms |
| 1,000 dictionaries | `check`    | 2,149 ms |         88 ms |

The language server analyzes 1,000 dictionaries in about 50 ms instead of about 2.7 s, and re-analyzes after one edit in about 20 ms.

## Which platforms

Prebuilt binaries are published as optional dependencies of `@dialexjs/cli`:

| Platform                      | Package                                                  |
| ----------------------------- | -------------------------------------------------------- |
| Linux x64 and arm64 (glibc)   | `@dialexjs/cli-linux-x64`, `@dialexjs/cli-linux-arm64`   |
| macOS Intel and Apple silicon | `@dialexjs/cli-darwin-x64`, `@dialexjs/cli-darwin-arm64` |
| Windows x64 and arm64         | `@dialexjs/cli-win32-x64`, `@dialexjs/cli-win32-arm64`   |

Alpine Linux (musl) and other platforms have no binary and use the Node CLI. So does an install with `--no-optional`.

## How it is chosen

`dx` is a small launcher. If the platform package is installed it runs the binary; otherwise it runs the Node CLI. On npm and Yarn classic, on Linux and macOS, the install step goes further and puts the binary where the launcher was, so `dx` starts without booting Node first (under 1 ms instead of about 25 ms). With `--ignore-scripts`, pnpm, Bun (which blocks lifecycle scripts by default) or Windows, the launcher stays and runs the same binary.

## What runs natively

| Command                                           | Native                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `dialex generate`                                 | Yes, for eager (non-lazy) projects with `-o`, `-c` and `--json`    |
| `dialex check`                                    | Yes, for `-c`, `--json`, `--github`, `--fail-on-stale` and `--src` |
| `--version`                                       | Yes                                                                |
| Language server                                   | Yes, opt-in with `DIALEX_NATIVE=1` (see below)                     |
| `init`, `export`, `import`, `lock`, `translate`   | No: Node CLI                                                       |
| `generate --watch`, `check --fix`, `lazy` loading | No: Node CLI                                                       |

A command also runs in Node when the native code meets something it must not guess:

- a `dialex.config.*` with spreads, computed keys or non-literal values (the Node CLI runs the file);
- a dictionary with spreads, computed keys, imported values or a computed name;
- a glob or locale tag it cannot interpret exactly.

The result is always the same as without the native binary; it is just not faster.

## Environment variables

| Variable                                            | Used by                     | Effect                                                                                                                                                                                                                              |
| --------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIALEX_NATIVE=0`                                   | CLI, language server        | Always use the Node implementation                                                                                                                                                                                                  |
| `DIALEX_NATIVE=1`                                   | CLI                         | When `generate` or `check` cannot be done natively, exit with code 1 and a reason instead of running in Node. Useful in CI to catch a dictionary that silently loses the speed-up. Commands that are Node-only run in Node as usual |
| `DIALEX_NATIVE=1`                                   | language server             | Run the native server. Without it the Node server runs                                                                                                                                                                              |
| `DIALEX_BINARY=/path/to/dx`                         | CLI launcher                | Use this binary instead of the installed platform package                                                                                                                                                                           |
| `DIALEX_LSP_BINARY=/path/to/dialex-language-server` | `@dialexjs/language-server` | Use this server binary                                                                                                                                                                                                              |
| `DIALEX_NODE_CLI=/path/to/index.mjs`                | native binary               | The Node CLI to hand commands to. The launcher sets it; set it yourself only when you run the binary on its own                                                                                                                     |
| `DIALEX_SKIP_NATIVE_INSTALL=1`                      | install step                | Keep the JavaScript launcher instead of replacing it with the binary                                                                                                                                                                |
| `NO_COLOR`                                          | CLI                         | Print without colors                                                                                                                                                                                                                |

## Use the native language server

The language server is opt-in for now. Set `DIALEX_NATIVE=1` in the environment that starts it; `@dialexjs/language-server` then runs the binary from the platform package. In Zed you can instead set `lsp.dialex.binary.path` to the binary. It has the same diagnostics, hover, go to definition, completion and quick fixes as the Node server. It does not regenerate `dialex.generated.ts` for projects that use lazy loading; run `dialex generate` for those.

## Check which one ran

`dialex --version` prints the same number either way. To see whether a command was done natively, run it with `DIALEX_NATIVE=1`: if it prints its normal output, it ran natively; if it exits with `dialex: native check declined: ...`, the reason is in the message and without the variable it would have run in Node.
