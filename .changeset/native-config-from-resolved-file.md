---
"@dialexjs/config": minor
"@dialexjs/cli": minor
---

Add `@dialexjs/config`. It reads `dialex.config.*` (running it only when the syntax tree is not enough) and writes `.dialex/config.json`, which the native `dx` and language server now read instead of parsing the config themselves. The file records the config, what it imported and the environment variables it read, so it is checked on every run and written again when stale.

Add `.dialex/` to your `.gitignore`.
