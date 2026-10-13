---
"@dialexjs/cli": patch
"@dialexjs/language-server": patch
---

Remove the Rust port. The native `dx`, the native language server and the `@dialexjs/cli-<platform>` packages were never published, and `@dialexjs/config` is gone with them: the CLI reads `dialex.config.*` itself, `dialex` and `dx` run from `dist/index.mjs`, and `.dialex/config.json` is no longer written. Nothing to change in your projects.
