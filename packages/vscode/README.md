<p align="center">
  <img src="https://raw.githubusercontent.com/awaiden/dialex/main/assets/logo.png" alt="Dialex" width="96" height="96" />
</p>

# Dialex for VS Code

Editor support for [Dialex](https://github.com/awaiden/dialex) translations.

## Features

- **Diagnostics**: missing keys and locales in `.content.ts` dictionaries, `getDictionary("x")` / `t("x.y")` calls that point at nothing, invalid ICU messages, and leftover `[TODO]` placeholders.
- **Hover**: hover a `t("home.title")` key, a dictionary name, or a member such as `getDictionary("home").title` to see the text in every locale.
- **Go to definition**: jump from a key to where it is written in the dictionary.
- **Completion**: dictionary names and key paths inside `t("…")`, `getDictionary("…")`, `useDictionary("…")`.
- **Quick fixes**: add a missing key to a locale (marked `[TODO]`), add every missing key in a file, or create a key that code refers to.

## Safe by design

The extension reads your config and dictionaries from the syntax tree. It **never runs your project's code**, so it works in untrusted workspaces. The cost: dictionaries built with spreads, computed keys, or imported values cannot be analyzed and show an informational note. Run `dialex check` for those.

## Settings

| Setting             | Default | Description                                                                              |
| ------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `dialex.enable`     | `true`  | Turn the extension's features on or off                                                  |
| `dialex.unusedKeys` | `false` | Fade out keys and dictionaries that no source file seems to use (a word-match heuristic) |
| `dialex.configPath` | `""`    | Config file path, relative to each project root                                          |

## Projects

A project is a folder with a `dialex.config.*` or `i18n.config.*`. Monorepos with several projects are supported; a dictionary belongs to the nearest project. Without any config file, a workspace that contains `*.content.ts` files is treated as one project with the default settings.

## Commands

- **Dialex: Refresh Diagnostics**: re-analyze all projects now. Diagnostics also refresh when you save a file or change a dictionary or config.
