# @dialexjs/eslint-plugin

## 0.9.1

### Patch Changes

- Updated dependencies [3417785]
  - @dialexjs/cli@0.9.1

## 0.9.0

### Minor Changes

- 4b70e2e: Add `@dialexjs/eslint-plugin`, ESLint and oxlint rules for unknown dictionaries and keys, dynamic keys, hard-coded text and dictionary files.

  Checks are configured once in `dialex.config.ts` under `lint.rules` (level and options per diagnostic code), and `dialex check`, the editors and the plugin all read it. The analyzer skips comments, understands dictionaries registered inline with `dictionaries: { name: ... }`, and honours `dialex-ignore` / `dialex-ignore-next-line` comments. `@dialexjs/cli/api` gains `analyzeProjectSync`, and editors get a `dialex.diagnostics` setting for use with the plugin.

### Patch Changes

- Updated dependencies [4b70e2e]
  - @dialexjs/cli@0.9.0
