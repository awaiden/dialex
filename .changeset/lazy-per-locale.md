---
"dialexjs": minor
"@dialexjs/cli": minor
---

`lazy: "locale"` splits dictionaries per locale, so a visitor only downloads the language they read. `dx generate` writes one module per dictionary and locale into a `dialex.locales/` folder next to `dialex.generated.ts`, and `loaders` points at them. In a real Vite build the main bundle holds neither language, and a Turkish page fetched only the `.tr` chunks until the visitor switched to English, which then fetched the `.en` ones.

- Switching language downloads the new locale on demand. In React the current language stays on screen until the new one has arrived (the update runs in a transition); in Vue the dictionary is empty until it loads, and server-side rendering waits for it.
- `preloadDictionaries(dialex, { locale: "tr" }, "pricing")` fetches a locale ahead of time.
- A dictionary is split only when each locale is self-contained. If a locale uses something defined elsewhere in its file (an import or a helper), the dictionary is loaded whole and `dx generate` says why.
- `dx check` reports missing or out-of-date per-locale modules, and `--fix` rewrites them. `lazy: true` is unchanged.
- `dx generate` no longer treats its own output (`dialex.generated.ts`, `*.d.ts`) as dictionaries when `include` is broad, such as `src/**/*.ts`.
