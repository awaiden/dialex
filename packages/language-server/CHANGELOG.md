# @dialexjs/language-server

## 0.8.0

### Minor Changes

- d26dbc9: A native `dx` and a native language server, written in Rust.

  - `dialex generate` and `dialex check` run as a native binary on Linux, macOS and Windows (x64 and arm64), installed as an optional dependency (`@dialexjs/cli-<platform>`). On a project with 1,000 dictionaries they are 25 to 40 times faster, and they write the same files and print the same output, byte for byte. A command that needs your code to run (a config that is not plain data, `translate`, `runtime: true`, lazy loading, `--fix`, `--watch`) or that is not native yet (`init`, `export`, `import`, `lock`, `translate`) is handed to the Node CLI as before. `DIALEX_NATIVE=0` always uses Node; `DIALEX_NATIVE=1` fails instead of falling back.
  - `dialex-language-server` has a native build with the same diagnostics, hover, go to definition, completion and quick fixes, and about 50 ms to analyze 1,000 dictionaries (2.7 s in Node). It is opt-in for this release: set `DIALEX_NATIVE=1`, or point your editor at the binary. Quick fix edits mean the same as before but are not laid out identically to the Node server's.
  - The native packages are published as `@dialexjs/cli-linux-x64`, `-linux-arm64`, `-darwin-x64`, `-darwin-arm64`, `-win32-x64` and `-win32-arm64`. Alpine (musl) and other platforms keep using the Node CLI.

  Documentation: a "Native binary" section on the CLI page and a note on the editor page, in five languages.

### Patch Changes

- 71b5b3a: A second round of speed-ups.

  - **Plural messages are about 7 times faster.** The results of `Intl.PluralRules.select` and of the `#` number format for counts 0 to 255 are remembered per locale (exactly what Intl returned, so every locale and numbering system stays correct), and messages with two or three parts get unrolled closures. `t()` on a plural: 1.3 M to 9.9 M operations per second; nested select and plural: 1.2 M to 8.5 M; interpolation: 12.2 M to 16.9 M; lookup: 43.5 M to 46.3 M.
  - **Bundle size:** the `t` program is 8,025 B minified (3,029 B gzip), up from 7,227 B (2,739 B). The compiled closures and caches are the price of the speed above; the 10% size target was not met.
  - **`dx` starts without Node.** With npm or Yarn classic on Linux and macOS, the install step replaces the JavaScript launcher with the native binary (about 25 ms of launcher overhead down to under 1 ms). `--ignore-scripts`, pnpm, Windows and every other case keep the JavaScript launcher.
  - **Language server re-analysis is about 4 times faster.** After one edit in a project of 1,000 dictionaries it takes about 20 ms instead of about 75 ms: unchanged dictionaries and source files are reused, the tree is not walked again for a content edit, and unchanged diagnostics are not sent again.

- Updated dependencies [6aa75d3]
- Updated dependencies [71b5b3a]
- Updated dependencies [621a03a]
- Updated dependencies [d26dbc9]
- Updated dependencies [5c72368]
  - @dialexjs/cli@0.8.0

## 0.7.2

### Patch Changes

- 0800399: Editor features follow a dictionary held in a variable: after `const s = useDictionary("showcase")`, hover, go to definition and completion work on `s.nav.features` and `s.`, in the language server and the VS Code extension.
- @dialexjs/cli@0.7.2

## 0.7.1

### Patch Changes

- 8ee86f2: New package `@dialexjs/language-server`: a language server (LSP) for Dialex translations, so editors other than VS Code get diagnostics, hover, go to definition, completion, quick fixes and automatic `dialex.generated.ts` updates. The editor-independent features (hover, definition, completion, quick fixes, project discovery) moved into it and are shared with the VS Code extension.
- Updated dependencies [b883a78]
  - @dialexjs/cli@0.7.1
