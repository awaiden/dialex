# @dialexjs/language-server

## 0.9.1

### Patch Changes

- 3417785: Remove the Rust port. The native `dx`, the native language server and the `@dialexjs/cli-<platform>` packages were never published, and `@dialexjs/config` is gone with them: the CLI reads `dialex.config.*` itself, `dialex` and `dx` run from `dist/index.mjs`, and `.dialex/config.json` is no longer written. Nothing to change in your projects.
- Updated dependencies [3417785]
  - @dialexjs/cli@0.9.1

## 0.9.0

### Minor Changes

- 4b70e2e: Add `@dialexjs/eslint-plugin`, ESLint and oxlint rules for unknown dictionaries and keys, dynamic keys, hard-coded text and dictionary files.

  Checks are configured once in `dialex.config.ts` under `lint.rules` (level and options per diagnostic code), and `dialex check`, the editors and the plugin all read it. The analyzer skips comments, understands dictionaries registered inline with `dictionaries: { name: ... }`, and honours `dialex-ignore` / `dialex-ignore-next-line` comments. `@dialexjs/cli/api` gains `analyzeProjectSync`, and editors get a `dialex.diagnostics` setting for use with the plugin.

### Patch Changes

- Updated dependencies [4b70e2e]
  - @dialexjs/cli@0.9.0

## 0.8.0

### Minor Changes

### Patch Changes

- 71b5b3a: A second round of speed-ups.

  - **Plural messages are about 7 times faster.** The results of `Intl.PluralRules.select` and of the `#` number format for counts 0 to 255 are remembered per locale (exactly what Intl returned, so every locale and numbering system stays correct), and messages with two or three parts get unrolled closures. `t()` on a plural: 1.3 M to 9.9 M operations per second; nested select and plural: 1.2 M to 8.5 M; interpolation: 12.2 M to 16.9 M; lookup: 43.5 M to 46.3 M.
  - **Bundle size:** the `t` program is 8,025 B minified (3,029 B gzip), up from 7,227 B (2,739 B). The compiled closures and caches are the price of the speed above; the 10% size target was not met.
  - **Language server re-analysis is about 4 times faster.** After one edit in a project of 1,000 dictionaries it takes about 20 ms instead of about 75 ms: unchanged dictionaries and source files are reused, the tree is not walked again for a content edit, and unchanged diagnostics are not sent again.

- Updated dependencies [6aa75d3]
- Updated dependencies [71b5b3a]
- Updated dependencies [621a03a]
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
