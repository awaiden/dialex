# dialex check

Verifies your dictionaries and how your code uses them. It exits with code `1` when it finds errors, so it fits pre-commit hooks and CI. Warnings never fail the run.

```bash
dialex check
dialex check --json
dialex check --github
dialex check --fix
dialex lint -c ./dialex.config.ts
```

## What it checks

**Errors**

- A configured locale is missing from a dictionary.
- A locale is missing a key that another locale has. Nested keys are compared by dotted path, for example `nav.about`.
- A string that clearly uses [ICU](../guide/icu.md) (`plural`, `select`, `number`, ...) is not valid ICU, or a locale uses different arguments than the default locale for the same key.
- Source code calls `getDictionary("x")`, `useDictionary("x")` or `@DialexDictionary("x")` with a dictionary that does not exist.
- Source code calls `t("home.nav.missing")` with a path that does not exist. Only `t()` calls whose first segment is a known dictionary name are checked, so unrelated `t()` functions are ignored.

**Warnings**

- A key is possibly unused. This is a heuristic: a key is considered used if its last segment appears anywhere in your source as a word, so dynamic access never causes a false error, and some unused keys can go unnoticed.
- A dictionary is never referenced.
- An ICU message uses plain `{placeholders}` but does not parse as ICU, or a plural option is missing for a language (for example `few` in Russian).
- A string still starts with `[TODO]`, left by `--fix` or a rejected translation.

Reference and unused-key checks scan `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`, skipping `node_modules`, build output, `*.d.ts`, generated files, config files and the dictionaries themselves. They are skipped when there is no source to scan.

## Options

| Option                | Description                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | Custom config path                                                                                               |
| `--json`              | Print machine-readable JSON (`success`, `totalIssues`, `totalWarnings`, `fixed`, `diagnostics`) and nothing else |
| `--github`            | Also print GitHub Actions annotations (`::error file=...,line=...::message`)                                     |
| `--fix`               | Insert missing keys before checking                                                                              |
| `--src <globs...>`    | Source globs to scan instead of the default                                                                      |

## --fix

For every key that one locale has and another lacks, `--fix` copies the default-locale value into the missing place. Strings get a `[TODO] ` prefix so they are easy to find; functions are copied as written. Missing configured locales are created. Edits are made on the syntax tree, so comments and the rest of the file are kept.

Run [`dialex translate`](./translate.md) afterwards to replace the placeholders with real translations.

## GitHub Actions

```yaml
- run: bunx dialex check --github
```

Errors and warnings show up as annotations on the files and lines they refer to.
