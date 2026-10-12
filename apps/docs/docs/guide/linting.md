# Linting with ESLint and oxlint

`@dialexjs/eslint-plugin` reports Dialex problems where your other lint errors already are: in the terminal, in CI and in any editor that runs ESLint or oxlint. It is one package for both linters, because oxlint loads ESLint-style plugins.

It needs a `dialex.config.*` above the file being linted and does nothing in projects without one. Like `dialex check`, it reads dictionaries and the config from the syntax tree and never runs project code.

## ESLint

Install it, then add its config to `eslint.config.js`:

```sh
npm install --save-dev @dialexjs/eslint-plugin
```

```js
import dialex from "@dialexjs/eslint-plugin";

export default [dialex.configs.recommended];
```

## oxlint

oxlint has no shareable configs, so list the plugin and the rules yourself in `.oxlintrc.json`:

```json
{
  "jsPlugins": ["@dialexjs/eslint-plugin"],
  "rules": {
    "dialex/no-unknown-dictionary": "error",
    "dialex/no-unknown-path": "error",
    "dialex/no-dynamic-key": "warn",
    "dialex/valid-dictionary": "error"
  }
}
```

oxlint's JS plugins are in alpha, and it does not run plugin rules on `.vue`, `.svelte` or `.astro` files. `dialex check` and the editor extensions still cover those.

## Rules

| Rule                           | Reports                                                                                                       | `recommended` |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------- |
| `dialex/no-unknown-dictionary` | `getDictionary("x")`, `useDictionary("x")` or `@DialexDictionary("x")` names a dictionary that does not exist | `error`       |
| `dialex/no-unknown-path`       | `t("a.nope")` where `a` is a known dictionary but has no such key                                             | `error`       |
| `dialex/no-dynamic-key`        | A dictionary name or key that is not a string literal, so Dialex cannot check it                              | `warn`        |
| `dialex/valid-dictionary`      | What `dialex check` finds in a dictionary file                                                                | `error`       |
| `dialex/no-literal-string`     | Text written in JSX instead of coming from a dictionary                                                       | off           |

### no-unknown-dictionary

The same check as the `unknown-dictionary` diagnostic. A dictionary registered in code with `dictionaries: { name: ... }` counts as known, and comments are never checked.

### no-unknown-path

The same check as `unknown-path`. Keys of dictionaries Dialex does not know are ignored, because `t()` may belong to another library.

### no-dynamic-key

`getDictionary(name)` and ``t(`home.${key}`)`` cannot be verified. A bare `t` is only checked in files that import from `dialexjs`, since other libraries use that name too.

### valid-dictionary

Runs on dictionary files, on the text in the editor, and reports the dictionary [codes](./diagnostics.md) such as `missing-key`, `missing-locale`, `invalid-icu` and `todo-placeholder`. Unused keys and dictionaries are left to `dialex check`, which sees the whole project. Skip codes with `ignore`:

```json
{ "dialex/valid-dictionary": ["error", { "ignore": ["todo-placeholder"] }] }
```

### no-literal-string

Flags JSX text that contains letters and the values of `title`, `alt`, `placeholder`, `aria-label` and `label`. It is off in `recommended` because most projects have some text that is fine to keep. Options:

```json
{
  "dialex/no-literal-string": [
    "warn",
    { "attributes": ["title", "alt"], "ignore": ["^OK$"], "ignoreComponents": ["Trans", "code"] }
  ]
}
```

`attributes` replaces the attribute list, `ignore` is a list of regular expressions matched against the trimmed text, and `ignoreComponents` names elements whose content is skipped (by default `Trans`, `code`, `pre`, `script` and `style`).

## Configuration

Rules are configured once, under `lint.rules` in `dialex.config.ts`. `dialex check`, the editor extensions and these ESLint and oxlint rules all read it, so a check is on or off, with the same options, everywhere.

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lint: {
    rules: {
      "unused-key": "off",
      "missing-key": "warn",
      "literal-string": ["warn", { ignore: ["^OK$"] }],
    },
  },
});
```

Keys are the [diagnostic codes](./diagnostics.md), plus `dynamic-key` and `literal-string`, which only the linter plugin evaluates. A value is `"off"`, `"warn"`, `"error"` or `[level, options]`. The level changes how `dialex check` and the editors report the issue. In ESLint it is the severity that `dialex.configs.recommended` gives the rule, read from the `dialex.config.*` in the directory ESLint runs in, and `literal-string` is only on in `recommended` when you set it here.

oxlint reads severities from `.oxlintrc.json`, which cannot be computed, so list the rules there at the level you want. `"off"` and options from `dialex.config.ts` still apply, so a check you turn off there stays quiet. `valid-dictionary` is one rule for many codes and the linter shows it at one level; per-code levels apply in `dialex check` and the editors. Options passed to a rule in the linter's own config override those from `dialex.config.ts`.

## Suppressing a report

Use the linter's own comments, such as `// eslint-disable-next-line dialex/no-unknown-dictionary`. The `dialex-ignore` comments from [Diagnostics](./diagnostics.md) are for `dialex check` and the editors, and the plugin does not read them.

## Editors

If your editor already shows these problems from ESLint or oxlint, turn off Dialex's own copy so each is shown once. Hover, completion and quick fixes keep working. In VS Code:

```json
{ "dialex.diagnostics": false }
```

In Zed, set `diagnostics` to `false` under `lsp.dialex.settings` ([Zed and other editors](./zed.md)).
