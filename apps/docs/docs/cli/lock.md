# dialex lock

Records the translations you have as up to date with their current source text, so that a later edit of the source can be noticed. It writes `dialex.lock.json`, next to your config.

```bash
dialex lock                  # adopt the lock file; leave out-of-date translations alone
dialex lock --all            # also accept translations that are already out of date
dialex lock -s en --json
```

| Option                  | Description                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `-s, --source <locale>` | The locale the translations were made from. Default: `translate.sourceLocale`, then `defaultLocale` |
| `--all`                 | Also record translations that are already out of date (accept them as they are)                     |
| `--json`                | Print machine-readable JSON                                                                         |
| `-c, --config <path>`   | Custom config path                                                                                  |

## What it does

For every string in a locale other than the source, it stores a short hash of the source locale's text for the same key, unless:

- the value still starts with `[TODO] ` (it is not translated yet);
- the source text changed since a record was made and `--all` is not given (it is out of date, so it is listed instead);
- the value is a function or another non-string value.

Run it once when you adopt the lock file, and again after you have reviewed the translations that [`dialex check`](./check.md) reported as out of date. [`dialex translate`](./translate.md) and [`dialex import`](./import.md) record what they write, so you do not need `lock` after them.

If the lock file was written from another source locale, it says nothing about this one and a fresh lock is started.

## Output

```json
{ "success": true, "sourceLocale": "en", "recorded": 5, "stale": [] }
```

| Field          | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `success`      | `true` unless the command failed (an unreadable config, for example)       |
| `sourceLocale` | The source locale used                                                     |
| `recorded`     | How many translations were newly recorded as up to date                    |
| `stale`        | Keys that are still out of date and were left alone (only without `--all`) |

The exit code is `0`, and `1` when the command could not run.

## The file

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

Keys are sorted, so the file produces small, stable diffs. Commit it, so the whole team sees the same state. A translation with no record, such as a hand-written one, is never reported as out of date.
