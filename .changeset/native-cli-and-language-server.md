---
"dialexjs": minor
"@dialexjs/cli": minor
"@dialexjs/language-server": minor
---

A native `dx` and a native language server, written in Rust.

- `dialex generate` and `dialex check` run as a native binary on Linux, macOS and Windows (x64 and arm64), installed as an optional dependency (`@dialexjs/cli-<platform>`). On a project with 1,000 dictionaries they are 25 to 40 times faster, and they write the same files and print the same output, byte for byte. A command that needs your code to run (a config that is not plain data, `translate`, `runtime: true`, lazy loading, `--fix`, `--watch`) or that is not native yet (`init`, `export`, `import`, `lock`, `translate`) is handed to the Node CLI as before. `DIALEX_NATIVE=0` always uses Node; `DIALEX_NATIVE=1` fails instead of falling back.
- `dialex-language-server` has a native build with the same diagnostics, hover, go to definition, completion and quick fixes, and about 50 ms to analyze 1,000 dictionaries (2.7 s in Node). It is opt-in for this release: set `DIALEX_NATIVE=1`, or point your editor at the binary. Quick fix edits mean the same as before but are not laid out identically to the Node server's.
- The native packages are published as `@dialexjs/cli-linux-x64`, `-linux-arm64`, `-darwin-x64`, `-darwin-arm64`, `-win32-x64` and `-win32-arm64`. Alpine (musl) and other platforms keep using the Node CLI.

Documentation: a "Native binary" section on the CLI page and a note on the editor page, in five languages.
