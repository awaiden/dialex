# CLI

`@dialexjs/cli` installiert zwei Binärdateien: `dialex` und den kürzeren Alias `dx`, praktisch in `package.json`-Skripten (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Befehl                               | Alias  | Zweck                                                               |
| ------------------------------------ | ------ | ------------------------------------------------------------------- |
| [`dialex init`](./init.md)           |        | Richtet Dialex in einem Projekt ein                                 |
| [`dialex generate`](./generate.md)   | `gen`  | Kompiliert Wörterbücher und Typdeklarationen                        |
| [`dialex check`](./check.md)         | `lint` | Prüft die Locale-Parität und wie der Code Wörterbücher verwendet    |
| [`dialex export`](./export.md)       |        | Exportiert Strings als JSON, CSV oder XLIFF für Übersetzer          |
| [`dialex import`](./import.md)       |        | Schreibt übersetzte Dateien zurück in die Wörterbücher              |
| [`dialex translate`](./translate.md) |        | Füllt fehlende Übersetzungen mit einem Machine-Translation-Provider |
| [`dialex lock`](./lock.md)           |        | Hält Übersetzungen als aktuell zum Quelltext fest                   |

Ein typischer Ablauf: `dialex check --fix`, um Platzhalter für neue Schlüssel anzulegen, dann entweder `dialex translate` oder `dialex export` / `dialex import` für menschliche Übersetzer, anschließend `dialex check` in der CI.

## Exit-Codes und JSON

| Befehl                                            | Exit-Code                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `generate`, `export`, `translate`, `lock`, `init` | `0` bei Erfolg, `1`, wenn der Befehl fehlschlägt (ein Syntaxfehler, ein unbekanntes Format, kein Provider...)                 |
| `check`                                           | `1`, wenn es Fehler findet; Warnungen lassen es nie fehlschlagen (`--fail-on-stale` macht veraltete Übersetzungen zu Fehlern) |
| `import`                                          | `1`, wenn es nicht laufen kann. Es endet mit `0`, auch wenn es Werte abgelehnt hat; lies `success` im JSON                    |

`generate`, `check`, `export`, `import`, `translate` und `lock` akzeptieren `--json`: Sie geben ein JSON-Objekt und sonst nichts aus, das ein anderes Programm lesen kann. Die Form steht auf der Seite des jeweiligen Befehls; für `check` siehe auch die [Diagnose-Referenz](../guide/diagnostics.md).
