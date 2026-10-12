# @dialexjs/cli

## 0.9.0

### Minor Changes

- 4b70e2e: Add `@dialexjs/eslint-plugin`, ESLint and oxlint rules for unknown dictionaries and keys, dynamic keys, hard-coded text and dictionary files.

  Checks are configured once in `dialex.config.ts` under `lint.rules` (level and options per diagnostic code), and `dialex check`, the editors and the plugin all read it. The analyzer skips comments, understands dictionaries registered inline with `dictionaries: { name: ... }`, and honours `dialex-ignore` / `dialex-ignore-next-line` comments. `@dialexjs/cli/api` gains `analyzeProjectSync`, and editors get a `dialex.diagnostics` setting for use with the plugin.

- 3de2c53: Add `@dialexjs/config`. It reads `dialex.config.*` (running it only when its syntax tree is not enough) and writes `.dialex/config.json` before every `dialex generate` and `dialex check`. The native `dx` and language server read that file instead of parsing the config themselves, so a config with spreads, imports or computed values no longer hands the whole command to the Node CLI, and there is one reader of the config instead of two.

  The language server resolves the config with the package of its own install and never runs a script it finds inside the workspace. Add `.dialex/` to your `.gitignore`.

### Patch Changes

- Updated dependencies [4b70e2e]
- Updated dependencies [3de2c53]
  - dialexjs@0.9.0
  - @dialexjs/config@0.9.0

## 0.8.0

### Minor Changes

- 621a03a: Seven new framework entry points and CLI support for them.

  - `dialexjs/preact`: Preact 10 and later. `<DialexProvider {...dialex}>`, `useDialex`, `useDictionary`, `useT`, `useDialexConfig`. No `preact/compat` needed.
  - `dialexjs/qwik`: `createDialexQwik({ ...dialex })` returns `useDialexProvider`, `useDialex`, `setLocale`, `useDictionary` (an accessor, `home().title`), `useT` and `getPersistedLocale`. Dictionaries stay in their module; only the locale is serialized into the page.
  - `dialexjs/lit`: `createDialex({ ...dialex })` holds the locale, and `DialexController` is a reactive controller that re-renders a Lit element on locale changes. It also works with plain custom elements through `subscribe`.
  - `dialexjs/react-native`: `DialexProvider` for React Native and Expo with `deviceLocales` (the device's languages) and `storage` (AsyncStorage, MMKV, anything with `getItem` and `setItem`). It uses the hooks of `dialexjs/react`.
  - `dialexjs/hapi`: the `dialexPlugin` for Hapi 21, adding `request.locale` and `request.getDictionary(name)`.
  - `dialexjs/adonis`: `createDialexMiddleware({ ...dialex })` for AdonisJS 6 and later, adding `ctx.locale` and `ctx.getDictionary(name)`.
  - `dialexjs/trpc`: `createDialexContext({ ...dialex })` puts the locale and dictionaries into the tRPC context from a Fetch `Request` or Node-style headers.
  - `DialexProvider` of `dialexjs/react` accepts `onLocaleChange(locale)`.
  - The `react` peer dependency is `>=19.0.0` (was `^19.3.0`), so Expo SDK apps pinned to React 19.2 install without a warning.
  - `dialex init` and the type registry detect Preact, Qwik, Lit, React Native / Expo, Hapi, AdonisJS and tRPC. React Native shares the `dialexjs/react` declarations.
  - `dialexjs/react-native` reads `storage` before it renders, so the first screen is already in the remembered language and a restore is not reported through `onLocaleChange`.
  - `dialexjs/qwik` loads lazy dictionaries (`lazy: true`) and renders the readers again when they arrive.
  - `dx generate` follows a `tsconfig.json` that extends a package (such as `@adonisjs/tsconfig`), or lists several configs, when it decides whether generated imports need the `.js` extension.
  - New examples: `examples/preact`, `qwik`, `lit`, `expo`, `hapi`, `adonis` and `trpc`.

  Documentation: a page for each new framework in five languages.

- d26dbc9: A native `dx` and a native language server, written in Rust.

  - `dialex generate` and `dialex check` run as a native binary on Linux, macOS and Windows (x64 and arm64), installed as an optional dependency (`@dialexjs/cli-<platform>`). On a project with 1,000 dictionaries they are 25 to 40 times faster, and they write the same files and print the same output, byte for byte. A command that needs your code to run (a config that is not plain data, `translate`, `runtime: true`, lazy loading, `--fix`, `--watch`) or that is not native yet (`init`, `export`, `import`, `lock`, `translate`) is handed to the Node CLI as before. `DIALEX_NATIVE=0` always uses Node; `DIALEX_NATIVE=1` fails instead of falling back.
  - `dialex-language-server` has a native build with the same diagnostics, hover, go to definition, completion and quick fixes, and about 50 ms to analyze 1,000 dictionaries (2.7 s in Node). It is opt-in for this release: set `DIALEX_NATIVE=1`, or point your editor at the binary. Quick fix edits mean the same as before but are not laid out identically to the Node server's.
  - The native packages are published as `@dialexjs/cli-linux-x64`, `-linux-arm64`, `-darwin-x64`, `-darwin-arm64`, `-win32-x64` and `-win32-arm64`. Alpine (musl) and other platforms keep using the Node CLI.

  Documentation: a "Native binary" section on the CLI page and a note on the editor page, in five languages.

- 5c72368: Two new framework entry points and CLI support for four more frameworks.

  - `dialexjs/svelte`: Svelte 4 and 5 (plain Vite apps, and SvelteKit components). `provideDialex({ ...dialex })` in the root component, then `useDictionary("home")` and `useT("home")` return stores (`$home.title`, `$t("home.cart.items", { count })`). It uses `svelte/store` and Svelte's context, so no runes or compile step are needed.
  - `dialexjs/solid`: SolidJS. `<DialexProvider {...dialex}>` and `useDictionary("home")` returning an accessor (`home().title`), `useT`, `useDialex`.
  - `dialex init` and the type registry detect Svelte, Solid and React Router (framework mode), and `dialex-env.d.ts` augments `dialexjs/svelte` and `dialexjs/solid`.
  - New config option `output`: where `dialex generate` writes `dialex.generated.ts` (the type declarations go next to it). React Router apps keep their source in `app/`.
  - New examples: `examples/vue`, `examples/svelte`, `examples/solid` and `examples/react-router`.

  Documentation: new pages for Svelte, Solid and React Router, a Best practices guide, and Best practices and Troubleshooting sections on every framework page, in five languages.

### Patch Changes

- 6aa75d3: Documentation and editor hints.

  - **Every public export has a TSDoc comment**, so editors show what `defineDictionary`, `defineConfig`, the formatters, the adapter options and the framework contexts do on hover. A test fails when a new export has none.
  - **`dialex translate --json` no longer prints the parsed dictionaries.** The `pending` list carried the whole syntax tree of each dictionary; it now has `file`, `locale`, `key`, `source` (and `stale` or `translated` when they apply).
  - **Docs:** a full API reference (signatures, parameters, return values, failures and examples for every export), plus new pages for how Dialex works, requirements and peer ranges, native binaries and their environment variables, a diagnostics reference with the JSON shape of `check`, troubleshooting, an FAQ, a glossary, and migration guides from i18next, react-intl, next-intl and vue-i18n. The CLI pages now document `--json`, exit codes, `--ai`, and `dialex lock`. A guard checks that the API reference names every export. All pages are available in English, Turkish, Spanish, German and Simplified Chinese.

- 71b5b3a: A second round of speed-ups.

  - **Plural messages are about 7 times faster.** The results of `Intl.PluralRules.select` and of the `#` number format for counts 0 to 255 are remembered per locale (exactly what Intl returned, so every locale and numbering system stays correct), and messages with two or three parts get unrolled closures. `t()` on a plural: 1.3 M to 9.9 M operations per second; nested select and plural: 1.2 M to 8.5 M; interpolation: 12.2 M to 16.9 M; lookup: 43.5 M to 46.3 M.
  - **Bundle size:** the `t` program is 8,025 B minified (3,029 B gzip), up from 7,227 B (2,739 B). The compiled closures and caches are the price of the speed above; the 10% size target was not met.
  - **`dx` starts without Node.** With npm or Yarn classic on Linux and macOS, the install step replaces the JavaScript launcher with the native binary (about 25 ms of launcher overhead down to under 1 ms). `--ignore-scripts`, pnpm, Windows and every other case keep the JavaScript launcher.
  - **Language server re-analysis is about 4 times faster.** After one edit in a project of 1,000 dictionaries it takes about 20 ms instead of about 75 ms: unchanged dictionaries and source files are reused, the tree is not walked again for a content edit, and unchanged diagnostics are not sent again.

- Updated dependencies [6aa75d3]
- Updated dependencies [71b5b3a]
- Updated dependencies [621a03a]
- Updated dependencies [d26dbc9]
- Updated dependencies [f5cc8bd]
- Updated dependencies [5c72368]
  - dialexjs@0.8.0

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
