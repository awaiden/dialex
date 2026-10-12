# dialex export

Schreibt die Strings deiner Wörterbücher in Dateien, mit denen Übersetzer arbeiten können, ohne TypeScript anzufassen.

```bash
dialex export                      # JSON, into ./dialex-export
dialex export -f csv
dialex export -f xliff -o translations
dialex export -l tr de
```

| Option                      | Beschreibung                                                            |
| --------------------------- | ----------------------------------------------------------------------- |
| `-f, --format <format>`     | `json` (Standard), `csv` oder `xliff`                                   |
| `-o, --out <dir>`           | Ausgabeverzeichnis (Standard `dialex-export`)                           |
| `-l, --locale <locales...>` | Auf diese Locales beschränken (das Standard-Locale ist immer enthalten) |
| `-c, --config <path>`       | Eigener Konfigurationspfad                                              |
| `--json`                    | Gibt maschinenlesbares JSON und sonst nichts aus                        |

## Formate

Schlüssel sind Punktpfade mit dem Wörterbuchnamen als Präfix, zum Beispiel `home.nav.about`.

- **JSON**: eine flache Datei pro Locale, `en.json`, `tr.json`, ... mit `{ "home.title": "Welcome" }`.
- **CSV**: eine einzelne `translations.csv` mit einer Spalte `key` und einer Spalte pro Locale. Leere Zellen sind fehlende Übersetzungen.
- **XLIFF 1.2**: eine `<locale>.xlf` pro Nicht-Standard-Locale, mit dem Text des Standard-Locales als `<source>` und dem Text des Locales als `<target>`. Fehlende Übersetzungen haben kein `<target>`.

Exportiert werden nur einfache String-Werte. Funktionswerte wie `(name) => \`Hello ${name}\`` lassen sich nicht als Text übersetzen und werden gezählt und als übersprungen gemeldet. Schlüssel dürfen in ihren eigenen Namen keine Punkte enthalten.

Hole die Übersetzungen mit [`dialex import`](./import.md) zurück.

## Ausgabe und Exit-Code

Mit `--json` gibt es ein Objekt aus:

```json
{
  "success": true,
  "files": ["dialex-export/en.json", "dialex-export/tr.json"],
  "keys": 15,
  "skippedFunctions": 1,
  "skippedFiles": []
}
```

| Feld               | Beschreibung                                            |
| ------------------ | ------------------------------------------------------- |
| `files`            | Die geschriebenen Dateien                               |
| `keys`             | Wie viele Schlüssel exportiert wurden                   |
| `skippedFunctions` | Wie viele Funktionswerte ausgelassen wurden (kein Text) |
| `skippedFiles`     | Wörterbuchdateien, die sich nicht lesen ließen          |

Der Exit-Code ist `1`, wenn der Befehl fehlschlägt, etwa bei einem unbekannten `--format`.
