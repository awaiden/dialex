# @dialexjs/eslint-plugin

## 0.9.3

### Patch Changes

- Security, correctness, and stability fixes:

  - Validate fallback locale candidates as BCP-47 in `dialexjs`, guard `lookupLocale` with `Object.hasOwn`, HTML-escape SvelteKit `LANG_PLACEHOLDER`, prevent unhandled rejections on failed lazy dictionary loads in Vue/Svelte/Solid, harden ICU `null`/empty-string/currency handling, and migrate Express/Fastify/Hono/Koa/NestJS adapters to shared request locale resolution.
  - Run `dialex_generate` in static mode, confine MCP file/config/output paths to the workspace root, and reject empty key paths in `setString()` / `dialex_set_key`.
  - Fix async `refresh()` / `syncWatchers()` race conditions in `@dialexjs/language-server` (and the VS Code extension), CSV formula escaping / mid-cell quote parsing / check pluralization / cache pruning in `@dialexjs/cli`, and the `oxlint` diagnostic snippet test in `@dialexjs/eslint-plugin`.

- Updated dependencies
  - @dialexjs/cli@0.9.3

## 0.9.2

### Patch Changes

- @dialexjs/cli@0.9.2

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
