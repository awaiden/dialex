# @dialexjs/cli

## 0.7.2

### Patch Changes

- Updated dependencies [0800399]
  - dialexjs@0.7.2

## 0.7.1

### Patch Changes

- b883a78: The VS Code extension re-reads only the files that changed. `analyzeProject` takes an optional `cache` (`createAnalysisCache()`) that remembers parsed dictionaries and scanned source files by modification time, and the extension keeps the project layout and `.gitignore` rules until files are added or removed. On a synthetic project with 10,000 source files a refresh went from about 950 ms to about 240 ms.
- Updated dependencies [b883a78]
- Updated dependencies [8ee86f2]
  - dialexjs@0.7.1

## 0.7.0

### Minor Changes

- 5d7f143: The scanners (`dx generate`, `dx check`, the watcher, the analysis API and the VS Code extension) now respect `.gitignore`: files in ignored folders are no longer picked up as dictionaries or sources. Monorepo packages inherit the repository's `.gitignore`, and nested `.gitignore` files apply to their folder.

  New config option `exclude` (globs relative to the project) for anything else. All scanners now share one list of built-in ignores (`node_modules`, `dist`, `.next`, `dialex.locales`, and for sources `.nuxt`, `.output`, `.svelte-kit`, `.astro`, `coverage`, `*.d.ts`, generated and config files), so they no longer disagree.

### Patch Changes

- Updated dependencies [5d7f143]
- Updated dependencies [3909e30]
  - dialexjs@0.7.0

## 0.6.0

### Minor Changes

- 39eca0b: `dialexjs` no longer depends on `fast-glob` and `unconfig` (about 2.9 MB of installed size, mostly `jiti`). The project scanner moved into `@dialexjs/cli`, which already did all the scanning.

  **Breaking:** the `dialexjs/scanner` entry point is gone, and adapters no longer scan the project at startup when no `dictionaries` are passed. Pass the generated registry (`{ ...dialex }` from `dialex.generated.ts`); an adapter without it only finds dictionaries already registered through `defineDictionary`.

### Patch Changes

- Updated dependencies [725a0c0]
- Updated dependencies [39eca0b]
  - dialexjs@0.6.0

## 0.5.2

### Patch Changes

- Updated dependencies [d5d3669]
  - dialexjs@0.5.2

## 0.5.1

### Patch Changes

- Updated dependencies [9b108bb]
- Updated dependencies [d1dcad5]
  - dialexjs@0.5.1

## 0.5.0

### Minor Changes

- 4050d36: `lazy: "locale"` splits dictionaries per locale, so a visitor only downloads the language they read. `dx generate` writes one module per dictionary and locale into a `dialex.locales/` folder next to `dialex.generated.ts`, and `loaders` points at them. In a real Vite build the main bundle holds neither language, and a Turkish page fetched only the `.tr` chunks until the visitor switched to English, which then fetched the `.en` ones.

  - Switching language downloads the new locale on demand. In React the current language stays on screen until the new one has arrived (the update runs in a transition); in Vue the dictionary is empty until it loads, and server-side rendering waits for it.
  - `preloadDictionaries(dialex, { locale: "tr" }, "pricing")` fetches a locale ahead of time.
  - A dictionary is split only when each locale is self-contained. If a locale uses something defined elsewhere in its file (an import or a helper), the dictionary is loaded whole and `dx generate` says why.
  - `dx check` reports missing or out-of-date per-locale modules, and `--fix` rewrites them. `lazy: true` is unchanged.
  - `dx generate` no longer treats its own output (`dialex.generated.ts`, `*.d.ts`) as dictionaries when `include` is broad, such as `src/**/*.ts`.

- b39c7f6: Stale translations are detected. `dx translate` now writes `dialex.lock.json`, which records a short hash of the source text behind each translation, so a later edit of the source no longer leaves the other languages silently out of date.

  - `dx check` warns about each translation whose source text changed since it was recorded (`stale-translation`), and `--fail-on-stale` makes it an error. The VS Code extension shows the same warning. Translations without a record (hand-written ones) are never reported.
  - `dx translate --stale` translates the out-of-date strings again; only these may replace an existing translation.
  - `dx lock` records the translations you already have, so existing projects can adopt the lock file (`--all` also accepts out-of-date ones). `dx import` records what it imports once a lock file exists.
  - MCP: `dialex_missing` also lists `stale` translations.

- 5235a9f: `t()` checks ICU arguments. `dx generate` writes `MessageArguments` into `dialex-env.d.ts` (read from each dictionary's default locale), so `t("cart.items", { count })` fails to compile when `count` is missing, misspelled or not a number. `plural`, `selectordinal` and `number` are `number`, `date` and `time` are `Date | number`, `select` is the union of its options, and a plain `{name}` takes a string, number, boolean or `Date`.

  A message that has ICU arguments can no longer be called without values (`t("cart.owner")` was allowed and returned the raw string). Pass the values, or remove the braces if they were literal.

  Adapters that scan the project at runtime (no `dictionaries` passed) no longer write `dialex-env.d.ts`; it was a second writer that could undo the generated file. Run `dx generate`.

### Patch Changes

- Updated dependencies [4050d36]
- Updated dependencies [b39c7f6]
- Updated dependencies [5235a9f]
  - dialexjs@0.5.0
