# dialex import

Schreibt übersetzte Strings aus einer Datei zurück in die Quelldateien deiner Wörterbücher.

```bash
dialex import dialex-export/tr.json
dialex import dialex-export/translations.csv
dialex import translations/tr.xlf
dialex import --locale tr strings.json
```

| Option                  | Beschreibung                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `-f, --format <format>` | `json`, `csv` oder `xliff` (wird aus der Dateiendung abgeleitet) |
| `-l, --locale <locale>` | Locale für Dateien mit nur einem Locale                          |
| `--allow-new`           | Fügt Schlüssel hinzu, die noch in keinem Locale existieren       |
| `-c, --config <path>`   | Eigener Konfigurationspfad                                       |

## Wie Locales gefunden werden

- **JSON**: Eine flache Datei wie `tr.json` übernimmt ihr Locale aus dem Dateinamen oder aus `--locale`. Eine Datei der Form `{ "tr": { "home.title": "..." } }` bringt ihre Locales selbst mit.
- **CSV**: Die Kopfzeile benennt die Locales (`key,en,tr`). Leere Zellen werden ignoriert.
- **XLIFF**: das Attribut `target-language` oder `--locale`.

## Verhalten

- Vorhandene Strings werden aktualisiert und fehlende hinzugefügt, in der Wörterbuchdatei, mit denselben Syntaxbaum-Änderungen wie bei `check --fix`.
- Schlüssel, die in keinem Locale existieren, werden ignoriert und aufgelistet, sofern du nicht `--allow-new` angibst. Das schützt vor Tippfehlern und veralteten Exporten.
- Funktionswerte werden nie überschrieben; sie werden als unverändert gemeldet.
- Leere Werte werden übersprungen.
- [ICU](../guide/icu.md)-Nachrichten werden validiert: Ein Wert, der kein gültiges ICU ist oder andere Argumente verwendet als derselbe Schlüssel in einem anderen Locale, wird abgelehnt und aufgelistet.
