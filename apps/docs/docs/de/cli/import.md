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
| `--json`                | Gibt maschinenlesbares JSON und sonst nichts aus                 |

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

## Ausgabe und Exit-Code

Mit `--json` gibt es ein Objekt aus:

```json
{
  "success": false,
  "created": 0,
  "updated": 8,
  "skipped": [],
  "rejected": ["tr:a.items (invalid ICU: ...)"],
  "unknown": [],
  "errors": []
}
```

| Feld       | Beschreibung                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `success`  | `false`, wenn mindestens ein Wert abgelehnt wurde                                                                |
| `created`  | Hinzugefügte Werte                                                                                               |
| `updated`  | Geänderte Werte                                                                                                  |
| `skipped`  | Funktions- oder andere Nicht-Text-Werte, die unverändert blieben                                                 |
| `rejected` | Abgelehnte Werte als `locale:key (Grund)`: ungültiges ICU oder Argumente, die von einer anderen Locale abweichen |
| `unknown`  | Schlüssel, die in keiner Locale existieren und ignoriert wurden (mit `--allow-new` hinzufügen)                   |
| `errors`   | Probleme beim Lesen der Datei                                                                                    |

Der Exit-Code ist `1`, wenn der Befehl nicht laufen kann (eine fehlende Datei, ein unbekanntes Format). **Ein Lauf, der Werte abgelehnt hat, endet trotzdem mit `0`**: Prüfe `success` oder `rejected` im JSON, wenn ein Skript bei abgelehnten Werten stoppen soll.
