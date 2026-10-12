# Diagnostics reference

Every problem Dialex reports has a code, a severity and a message. The same checks run in [`dialex check`](../cli/check.md), in the [VS Code extension](./vscode.md) and in the [language server](./zed.md), so a problem looks the same everywhere.

## Severities

| Severity  | Meaning                                                  | In `dialex check`                                                                   | In the editor |
| --------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------- |
| `error`   | Something is wrong and will fail at runtime or in review | Exit code `1`                                                                       | Error         |
| `warning` | Something is probably wrong or left unfinished           | Reported, exit code `0` (`--fail-on-stale` turns `stale-translation` into an error) | Warning       |
| `info`    | A file cannot be analyzed, which is not an error         | Not shown                                                                           | Information   |

`unused-key` and `unused-dictionary` are warnings in `check`; editors show them as faded-out text (a hint) so they do not clutter the Problems panel, and only when the `unusedKeys` setting is on.

## Dictionary files

| Code                 | Severity | Message                                                                                 | Meaning and fix                                                                                                                                                                                   |
| -------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-dictionary` | error    | `Failed to parse dictionary: ...`                                                       | The file has a syntax error. Fix the syntax; the message says where                                                                                                                               |
| `invalid-dictionary` | error    | `Default export does not appear to be a valid defineDictionary output.`                 | Only with `runtime` analysis. `export default` must be `defineDictionary(...)`                                                                                                                    |
| `invalid-locale`     | error    | `Locale "x" content is empty or invalid.`                                               | Only with `runtime` analysis. A locale's content must be an object                                                                                                                                |
| `unanalyzable`       | info     | `This dictionary uses spreads, computed keys, imported values, or a computed name, ...` | The static tools cannot read the file. `dialex check` runs it instead; editors skip it. Use literal objects to get editor support (see [Dictionaries](./dictionaries.md#what-the-tools-can-read)) |
| `missing-locale`     | error    | `Missing configured locale "de"`                                                        | A locale in `locales` has no content in this dictionary. Add it, or run `dialex check --fix`                                                                                                      |
| `missing-key`        | error    | `Locale "tr" is missing key "nav.about"`                                                | Another locale has the key. Add it, run `--fix` (copies the value with a `[TODO]` marker) or use the editor's quick fix                                                                           |
| `todo-placeholder`   | warning  | `Locale "tr" key "title" still has a [TODO] placeholder`                                | A value still starts with `[TODO] `, left by `--fix`. Translate it, or run [`dialex translate`](../cli/translate.md)                                                                              |
| `stale-translation`  | warning  | `Locale "tr" key "title" is out of date: the "en" text changed after it was translated` | The source text changed after the translation was recorded in `dialex.lock.json`. Update the translation, then run `dialex lock`                                                                  |

## ICU messages

| Code                    | Severity | Message                                                                                                                      | Meaning and fix                                                                                                                              |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-icu`           | error    | `Invalid ICU message "a.items" (tr): ICU syntax error at 27: Missing required "other" option`                                | The string uses `plural`, `select`, `number`... and does not parse. The message gives the position. Plural and select need an `other` branch |
| `invalid-icu`           | warning  | `"a.soft" (en) contains braces but is not valid ICU, so t() values cannot be applied: ...`                                   | A string with plain braces does not parse, so `t()` would return it unchanged. Quote literal braces: `'{'`                                   |
| `icu-args-mismatch`     | error    | `Locale "tr" uses different arguments than "en" for "a.greeting" (expected name:any, found ad:any)`                          | Translations of one key must use the same argument names. Rename the argument in the translation                                             |
| `icu-plural-categories` | warning  | `Locale "ru" plural "count" in "a.items" has no "few", "many" option (used by this language; "other" will be shown instead)` | The language needs more plural categories than the message gives. Add them                                                                   |

## Source code

These need source files to scan; they are skipped when there are none. See [`dialex check`](../cli/check.md#what-it-checks) for what is scanned.

| Code                 | Severity | Message                              | Meaning and fix                                                                                                                            |
| -------------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `unknown-dictionary` | error    | `Unknown dictionary "zzz"`           | `getDictionary("zzz")`, `useDictionary("zzz")` or `@DialexDictionary("zzz")` names a dictionary that does not exist                        |
| `unknown-path`       | error    | `Unknown translation path "a.nope"`  | `t("a.nope")` where `a` is a known dictionary but has no such key. The editor offers a quick fix that adds the key to every locale         |
| `unused-key`         | warning  | `Key "only_en" is possibly unused`   | No source file contains the key's last segment as a word. A heuristic: dynamic access is never reported, and some unused keys go unnoticed |
| `unused-dictionary`  | warning  | `Dictionary "c" is never referenced` | No source file contains the dictionary's name                                                                                              |

## Generated files

`dialex check` also compares `dialex.generated.ts` and `dialex-env.d.ts` with what `dialex generate` would write, ignoring formatting. This one has no code:

| Severity | Message                                                                                | Fix                   |
| -------- | -------------------------------------------------------------------------------------- | --------------------- |
| error    | `Out of date with your dictionaries or config. Run `dx generate`(or`dx check --fix`).` | Run `dialex generate` |

## Output formats

**Human** output groups issues by file, with the line number after each message.

**`--json`** prints one object and nothing else:

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/features/a/a.content.ts",
      "name": "a",
      "errors": ["Missing configured locale \"de\""],
      "warnings": ["Key \"only_en\" is possibly unused"],
      "annotations": [
        { "level": "error", "message": "Missing configured locale \"de\"", "line": 3 }
      ]
    }
  ],
  "totalIssues": 1,
  "totalWarnings": 1,
  "fixed": 0
}
```

| Field           | Description                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `success`       | `false` when there is at least one error. The exit code is `1` in that case                                                                                                                            |
| `diagnostics`   | One entry per file with a problem: `file` (relative to the project), `name` (the dictionary, when it is one), `errors`, `warnings` and `annotations` (`level`, `message`, one-based `line` when known) |
| `totalIssues`   | The number of errors                                                                                                                                                                                   |
| `totalWarnings` | The number of warnings                                                                                                                                                                                 |
| `fixed`         | How many values `--fix` inserted                                                                                                                                                                       |

**`--github`** prints one workflow command per annotation (`::error file=...,line=...,title=dialex::message`), which GitHub shows on the files of a pull request.
