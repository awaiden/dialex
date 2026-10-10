---
"dialexjs": minor
"@dialexjs/cli": minor
"@dialexjs/mcp": minor
---

Stale translations are detected. `dx translate` now writes `dialex.lock.json`, which records a short hash of the source text behind each translation, so a later edit of the source no longer leaves the other languages silently out of date.

- `dx check` warns about each translation whose source text changed since it was recorded (`stale-translation`), and `--fail-on-stale` makes it an error. The VS Code extension shows the same warning. Translations without a record (hand-written ones) are never reported.
- `dx translate --stale` translates the out-of-date strings again; only these may replace an existing translation.
- `dx lock` records the translations you already have, so existing projects can adopt the lock file (`--all` also accepts out-of-date ones). `dx import` records what it imports once a lock file exists.
- MCP: `dialex_missing` also lists `stale` translations.
