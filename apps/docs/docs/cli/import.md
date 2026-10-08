# dialex import

Writes translated strings from a file back into your dictionary source files.

```bash
dialex import i18n-export/tr.json
dialex import i18n-export/translations.csv
dialex import translations/tr.xlf
dialex import --locale tr strings.json
```

| Option                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `-f, --format <format>` | `json`, `csv`, or `xliff` (inferred from the extension) |
| `-l, --locale <locale>` | Locale for single-locale files                          |
| `--allow-new`           | Add keys that do not exist in any locale yet            |
| `-c, --config <path>`   | Custom config path                                      |

## How locales are found

- **JSON**: a flat file such as `tr.json` takes its locale from the file name or `--locale`. A file shaped like `{ "tr": { "home.title": "..." } }` carries its own locales.
- **CSV**: the header row names the locales (`key,en,tr`). Empty cells are ignored.
- **XLIFF**: the `target-language` attribute, or `--locale`.

## Behavior

- Existing strings are updated and missing ones are added, in the dictionary file, using the same syntax-tree edits as `check --fix`.
- Keys that do not exist in any locale are ignored and listed, unless you pass `--allow-new`. This protects against typos and stale exports.
- Function values are never overwritten; they are reported as left unchanged.
- Empty values are skipped.
- [ICU](../guide/icu.md) messages are validated: a value that is not valid ICU, or that uses different arguments than the same key in another locale, is rejected and listed.
