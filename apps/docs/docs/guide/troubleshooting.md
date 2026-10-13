# Troubleshooting

Find the symptom, read the cause, apply the fix. Problems specific to one framework are on that framework's page; the rest are here. For what a `check` message means, see the [diagnostics reference](./diagnostics.md).

## Types and generated files

### `t("home.title")` or `getDictionary("home")` is not autocompleted or typed

The types come from `dialex-env.d.ts`, which `dialex generate` writes. Check, in order:

1. The file exists: run `dialex generate`.
2. TypeScript includes it. Add it (or its folder) to `include` in `tsconfig.json`, and restart the TypeScript server in your editor.
3. `moduleResolution` is `"bundler"`, `"node16"` or `"nodenext"` (see [Requirements](./requirements.md)).
4. The generated file is current: run `dialex generate --watch`, or use the editor extension, which regenerates on save.

### I changed a dictionary and the types did not update

Nothing rebuilds the generated files for you. Run `dialex generate`, keep `dialex generate --watch` running, or use the [VS Code extension](./vscode.md). `dialex check` reports a stale file as an error, so a CI run catches it.

### `Cannot find module 'dialexjs/react'` (or another subpath)

`moduleResolution` is `"node"` (also called `node10`), which does not read the package's `exports` map. Set it to `"bundler"` or `"nodenext"`.

### `dialex check` says the generated file is out of date, but I just generated it

A formatter (Prettier, Biome, oxfmt) may have rewritten it. `check` ignores whitespace, quotes and trailing commas, so formatting alone does not cause this: look for a different `locales` or `include`, a dictionary changed after the last run, or `dialex generate` run with `-o` while `check` looks at the default path. Add the generated files to your formatter's ignore list to avoid noisy diffs.

## Locales and dictionaries

### `[dialex] Dictionary "x" not found`

The dictionary is not in `dialex.generated.ts`. Check that its file matches `include` (default `**/*.content.ts`), is not excluded by `.gitignore` or `exclude`, uses `export default defineDictionary("x", ...)`, and that the name matches exactly. Then run `dialex generate`.

### `[dialex] Locale "tr" not found in dictionary "x", using "en"`

The dictionary has no `tr` content, so the [fallback chain](./fallbacks.md) was used. Add the locale, or run `dialex check --fix` to create the missing keys.

### The app always renders the default locale

No source produced a supported locale. Detection order is a custom extractor, the first URL segment, `?locale=` / `?lang=`, the `locale` / `lang` cookie, then `Accept-Language`. Check: `locales` is set (without it a path prefix such as `/tr` is ignored), the client really sends the cookie or header, and the adapter is registered before the routes. See [Locale Detection](./locale-detection.md).

### The locale changes on the client but the server renders another one

The server and the client resolve the locale separately. Pass the locale the server rendered with to the provider as `initialLocale`, so the first client render matches. A remembered locale is applied after mount, on purpose, so hydration agrees.

### `useDialex must be used within a DialexProvider`

The component is rendered outside the provider. Put `<DialexProvider {...dialex}>` at the root, above every component that uses a hook, and import the hooks from the same entry point as the provider.

### The dictionary is empty on the first render

You use `lazy` loading, so a dictionary is empty (or, in React, suspends) until it has loaded. Name the dictionaries you read (`useT("home")`), wrap React in `<Suspense>`, or call [`preloadDictionaries`](../api/client-frameworks.md#preloaddictionaries) before rendering. See [Lazy Loading](./lazy-loading.md).

## Messages

### `t("cart.items", { count })` returns the raw message

Either the string failed to parse (the console shows `[dialex] Could not format ...`) or no values object was passed: a string without values is returned as it is. Run `dialex check` for the exact ICU error.

### Literal braces or apostrophes show up wrong

In ICU, `{` and `}` start and end arguments, and `'` quotes them. Write a literal brace as `'{'`, and an apostrophe as `''`. A lone `'` before a letter is kept as is. See [ICU Messages](./icu.md).

### A plural shows the wrong form in another language

The language needs categories your message does not give (Russian needs `few` and `many`, Arabic six). `dialex check` warns with `icu-plural-categories`. Add the options; `other` is the fallback.

## CLI

### `dialex check` reports nothing for a dictionary

The dictionary uses spreads, computed keys or imported values and could not be read from the syntax tree. `dialex check` evaluates such a file; the editor skips it. See [Dictionaries](./dictionaries.md#what-the-tools-can-read).

### `dialex translate` says no provider is configured

Set `translate.provider` in `dialex.config.ts`. See [`dialex translate`](../cli/translate.md).

## Editors

### The editor shows no diagnostics, hover or completion

- The workspace has no Dialex project: it needs a `dialex.config.*`, or a `*.content.ts` file next to a `package.json`.
- The extension or server is disabled: check the `dialex.enable` setting.
- The dictionary uses spreads or computed keys: it is reported as not analyzable and skipped.
- The file is ignored by `.gitignore` or `exclude`.
- The language server did not start: in Zed it needs Node.js; check the server log for the reason.

### Unused keys are never shown

They are off by default. Turn on the `unusedKeys` setting; they then appear as faded-out text.

## Still stuck

Run `dialex check --json` and `dialex --version`, and open an issue on [GitHub](https://github.com/awaiden/dialex/issues) with the output, your `dialex.config.*`, and the smallest dictionary that shows the problem.
