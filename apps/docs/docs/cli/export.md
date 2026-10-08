# dialex export

Writes the strings of your dictionaries to files translators can work with, without touching TypeScript.

```bash
dialex export                      # JSON, into ./i18n-export
dialex export -f csv
dialex export -f xliff -o translations
dialex export -l tr de
```

| Option                      | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `-f, --format <format>`     | `json` (default), `csv`, or `xliff`                            |
| `-o, --out <dir>`           | Output directory (default `i18n-export`)                       |
| `-l, --locale <locales...>` | Limit to these locales (the default locale is always included) |
| `-c, --config <path>`       | Custom config path                                             |

## Formats

Keys are dotted paths prefixed with the dictionary name, for example `home.nav.about`.

- **JSON**: one flat file per locale, `en.json`, `tr.json`, ... with `{ "home.title": "Welcome" }`.
- **CSV**: one `translations.csv` with a `key` column and one column per locale. Empty cells are missing translations.
- **XLIFF 1.2**: one `<locale>.xlf` per non-default locale, with the default-locale text as `<source>` and the locale's text as `<target>`. Missing translations have no `<target>`.

Only plain string values are exported. Function values, such as `(name) => \`Hello ${name}\``, cannot be translated as text and are counted and reported as skipped. Keys cannot contain dots in their own names.

Bring translations back with [`dialex import`](./import.md).
