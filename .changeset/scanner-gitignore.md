---
"dialexjs": minor
"@dialexjs/cli": minor
---

The scanners (`dx generate`, `dx check`, the watcher, the analysis API and the VS Code extension) now respect `.gitignore`: files in ignored folders are no longer picked up as dictionaries or sources. Monorepo packages inherit the repository's `.gitignore`, and nested `.gitignore` files apply to their folder.

New config option `exclude` (globs relative to the project) for anything else. All scanners now share one list of built-in ignores (`node_modules`, `dist`, `.next`, `dialex.locales`, and for sources `.nuxt`, `.output`, `.svelte-kit`, `.astro`, `coverage`, `*.d.ts`, generated and config files), so they no longer disagree.
