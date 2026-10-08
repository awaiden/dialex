# VS Code Extension

The Dialex extension adds editor support for translations: diagnostics, hover, go to definition, completion and quick fixes. It lives in `packages/vscode` of the repository.

::: warning Status
The extension builds, packages into a `.vsix`, and its logic is covered by tests that run against a stand-in for the VS Code API. It has **not been tried in a real VS Code window yet**, and it is not published to the Marketplace. Follow [Try it out](#try-it-out) to run it yourself, and report anything that looks wrong.
:::

## Install

Build and package the extension, then install the `.vsix`:

```bash
cd packages/vscode
bun run build
bun run package                      # creates dialex-vscode-0.1.0.vsix
code --install-extension dialex-vscode-0.1.0.vsix
```

## Features

### Diagnostics

Problems are underlined where they are:

| In                   | Problem                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `.content.ts` file | A locale is missing a key that another locale has, or a configured locale is missing; invalid [ICU](./icu.md); arguments that differ between locales; `[TODO]` placeholders left by `dialex check --fix` |
| Source code          | `getDictionary("x")` or `t("x.y")` that points at nothing                                                                                                                                                |

Plural categories missing for a language (for example `few` in Russian) are reported as warnings. With `dialex.unusedKeys` on, keys and dictionaries that no source file seems to use are faded out.

### Hover

Hover a key in `t("home.title")`, a dictionary name in `getDictionary("home")`, or a member of the call, such as `.title` in `getDictionary("home").title`. A table shows the text in every locale (the default locale first) and marks locales where it is missing. Function values show their source.

### Go to definition

`F12` or ctrl/cmd-click on a key jumps to where it is written in the dictionary (the default locale's entry, or the first locale that has it).

### Completion

Inside the string of `t("…")`, `getDictionary("…")`, `useDictionary("…")` or `@I18nDictionary("…")`:

- dictionary names, with the number of keys and locales;
- after `t("home.`, the keys at that level, with the default-locale text as a preview. Groups continue with a dot and reopen the list.

### Quick fixes

Use the lightbulb (`Ctrl+.`/`Cmd+.`) on a diagnostic:

- **Add "nav.contact" to tr (marked [TODO])** copies the value from the default locale, like [`dialex check --fix`](../cli/check.md#fix).
- **Add all N missing keys** does it for the whole file.
- **Add "nav.pricing" to the "home" dictionary** (on an unknown `t()` path) creates the key in every locale as a `[TODO]` placeholder.

Fixes replace the file's text in the editor, so they can be undone, and nothing is written until you save.

## Settings

| Setting             | Default | Description                                                                                           |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `dialex.enable`     | `true`  | Turn all features on or off                                                                           |
| `dialex.unusedKeys` | `false` | Fade out possibly unused keys and dictionaries. It is a word-match heuristic, so it is off by default |
| `dialex.configPath` | `""`    | Config file path relative to each project root                                                        |

The command **Dialex: Refresh Diagnostics** re-analyzes everything. Diagnostics also refresh when you save a file or when a dictionary or config file changes.

## Projects

A project is a folder with a `dialex.config.*` or `i18n.config.*`. A dictionary that no configured project contains belongs to the nearest folder with a `package.json`, using default settings. In a monorepo each project is analyzed on its own, and a dictionary belongs to the nearest one.

## It never runs your code

The extension reads your config and dictionaries from the syntax tree and **never executes project code**. That is why it can declare support for untrusted workspaces, and it matters because config files and dictionaries are code.

The trade-off is that only statically visible values are understood:

- In `dialex.config`, `defaultLocale`, `locales`, `include`, `fallbacks`, `prefixDefault` and `lazy` must be literals. Anything computed is ignored and noted in the **Dialex** output channel.
- A dictionary that uses spreads, computed keys, or imported values cannot be analyzed. It gets an informational note instead of diagnostics. [`dialex check`](../cli/check.md) does import such files and checks them.

The same analysis is available programmatically as `@dialex/cli/api` (`analyzeProject`, `readStaticConfig`, and the dictionary editing helpers).

## Try it out

To run the extension from source in a real VS Code window:

1. Open the `packages/vscode` folder in VS Code.
2. Press `F5` ("Run Extension (examples)"). This builds the extension and opens a second window on the repository's `examples/` folder.
3. In that window, open an example, for example `examples/react/src`:
   - Delete a key from the `tr` block of `home.content.ts`: a red underline appears on `tr`, and the quick fix adds the key back.
   - Hover over a `t("home.…")` call, or press `F12` on it.
   - Type `t("home.` in a `.tsx` file and check the suggestions.
4. Open the **Dialex** output channel for notes about anything that could not be read statically.
