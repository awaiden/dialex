---
"dialexjs": patch
"@dialexjs/cli": patch
---

Documentation and editor hints.

- **Every public export has a TSDoc comment**, so editors show what `defineDictionary`, `defineConfig`, the formatters, the adapter options and the framework contexts do on hover. A test fails when a new export has none.
- **`dialex translate --json` no longer prints the parsed dictionaries.** The `pending` list carried the whole syntax tree of each dictionary; it now has `file`, `locale`, `key`, `source` (and `stale` or `translated` when they apply).
- **Docs:** a full API reference (signatures, parameters, return values, failures and examples for every export), plus new pages for how Dialex works, requirements and peer ranges, native binaries and their environment variables, a diagnostics reference with the JSON shape of `check`, troubleshooting, an FAQ, a glossary, and migration guides from i18next, react-intl, next-intl and vue-i18n. The CLI pages now document `--json`, exit codes, `--ai`, and `dialex lock`. A guard checks that the API reference names every export. All pages are available in English, Turkish, Spanish, German and Simplified Chinese.
