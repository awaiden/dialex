---
"@dialexjs/eslint-plugin": minor
"@dialexjs/cli": minor
"dialexjs": minor
"@dialexjs/language-server": minor
---

Add `@dialexjs/eslint-plugin`, ESLint and oxlint rules for unknown dictionaries and keys, dynamic keys, hard-coded text and dictionary files.

Checks are configured once in `dialex.config.ts` under `lint.rules` (level and options per diagnostic code), and `dialex check`, the editors and the plugin all read it. The analyzer skips comments, understands dictionaries registered inline with `dictionaries: { name: ... }`, and honours `dialex-ignore` / `dialex-ignore-next-line` comments. `@dialexjs/cli/api` gains `analyzeProjectSync`, and editors get a `dialex.diagnostics` setting for use with the plugin.
