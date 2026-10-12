# FAQ

Short answers, with links to the page that has the detail.

## Design

### Why are dictionaries TypeScript files and not JSON?

So the compiler can check them. A dictionary is code: its keys are typed, a value can be a function with typed parameters, and editors can jump from `t("home.title")` to the definition. JSON stays available at the edges: [`dialex export`](../cli/export.md) writes JSON, CSV or XLIFF for translators and [`dialex import`](../cli/import.md) writes their work back into the TypeScript files.

### Can I load translations from an API or a database at runtime?

Dialex is built for translations that ship with the app. A dictionary is any object, so you can fill one yourself and pass it as `dictionaries` to an adapter or provider, but then it is not typed, checked or generated for you. For content that changes without a deploy, use your CMS and keep UI strings in Dialex.

### How big is the runtime?

The `t()` function with the ICU parser and formatter is about 8 KB minified (3 KB gzip); `dialexjs/icu` on its own is about 7 KB. The framework adapters are small on top of that. See [Benchmarks](./benchmarks.md) for the measured figures and the comparison with other libraries.

### Does it work with server-side rendering?

Yes. The server adapters resolve the locale per request, and the UI providers take an `initialLocale` so the first client render matches the server's. A remembered locale is applied after mount, on purpose, so hydration never mismatches. See your [framework page](../frameworks/README.md).

## Locales

### How do I add a language?

1. Add it to `locales` in `dialex.config.ts`.
2. Run `dialex check --fix`: every dictionary gets the missing keys, copied from the default locale and marked `[TODO]`.
3. Translate them: by hand, with [`dialex translate`](../cli/translate.md) and a provider, or through [`export`/`import`](../cli/export.md).
4. Run `dialex generate` and `dialex check`.

### Does Dialex pick the language from the browser?

On the server, yes: adapters read `Accept-Language`, the URL, the query string and cookies, in that [order](./locale-detection.md). In the browser the providers do not read `navigator.language`: they use the locale the server resolved and the choice the user made (kept in a cookie or `localStorage`). React Native takes the device's languages through `deviceLocales`.

### What happens when a translation is missing?

The lookup follows the [fallback chain](./fallbacks.md): the locale itself, explicit `fallbacks`, the language without region (`pt-BR` to `pt`), then the default locale. If nothing has the key, `t()` warns and returns the path. `dialex check` reports missing keys so they do not reach production.

### Does it support right-to-left languages?

Dialex translates text and formats numbers and dates; it does not set the text direction. The providers keep `<html lang>` in sync with the locale. Derive `dir` from the locale yourself, for example `dir={["ar", "he", "fa"].includes(locale) ? "rtl" : "ltr"}`.

### How do plurals work in languages with many forms?

Messages use ICU `plural` and `selectordinal` with the CLDR rules of the locale, through `Intl.PluralRules`. Russian needs `one`, `few`, `many` and `other`; Arabic has six categories. `dialex check` warns when a message lacks a category its language needs. See [ICU Messages](./icu.md).

## Workflow

### Do I have to run `dialex generate` all the time?

Run `dialex generate --watch` while you develop, or use the [VS Code extension](./vscode.md), which regenerates on save. In CI, run `dialex check`: it fails when the generated files are out of date.

### Where should I commit the generated files?

Either way works. Committing them means a fresh clone type-checks without a build step; ignoring them means every install must run `dialex generate`. `dialex check` compares the generated files with what `generate` would write, so if you commit them, CI keeps them honest.

### How do translators work with it?

Give them [`dialex export`](../cli/export.md) output (JSON, CSV or XLIFF); they never see TypeScript. Bring their work back with [`dialex import`](../cli/import.md), which validates ICU messages and refuses unknown keys. Or let a provider translate with [`dialex translate`](../cli/translate.md), and use `dialex lock` to notice when a source text changes afterwards.

### Does `dialex translate` send my code anywhere?

No. Nothing is sent unless you configure a provider, and then only the strings to translate (not your code) go to that provider, in batches. `dialex translate --dry-run` lists what would be sent.

### Can I use it in a monorepo?

Yes. Each package with a `dialex.config.*` (or just `*.content.ts` files) is a project. The CLI works from the folder you run it in, and the editor tooling finds every project in the workspace and keeps nested projects apart. `.gitignore` files of the repository are respected.

## Tooling

### Is the CLI written in Rust?

`dialex generate` and `dialex check` have a native implementation that produces the same output as the Node CLI and is 20 to 40 times faster on large projects; everything else runs in Node. See [Native binaries](./native.md).

### Why does the editor skip one of my dictionaries?

It cannot read it without running code: it uses a spread, a computed key, an imported value or a computed name. Use literal objects, or accept that `dialex check` (which evaluates the file) is the check for that file. See [Dictionaries](./dictionaries.md#what-the-tools-can-read).

### What does "pre-1.0" mean for me?

The API can change between minor versions. Breaking changes ship in a minor release, are listed in the [changelog](./changelog.md), and patch releases stay compatible. Pin the minor version you use.
