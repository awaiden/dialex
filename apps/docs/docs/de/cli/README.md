# CLI

`@dialex/cli` installiert zwei Binärdateien: `dialex` und den Alias `dx`.

```bash
npm install -D @dialex/cli dialex
npm install -g @dialex/cli   # or globally
```

| Befehl                               | Alias  | Zweck                                                               |
| ------------------------------------ | ------ | ------------------------------------------------------------------- |
| [`dialex init`](./init.md)           |        | Richtet Dialex in einem Projekt ein                                 |
| [`dialex generate`](./generate.md)   | `gen`  | Kompiliert Wörterbücher und Typdeklarationen                        |
| [`dialex check`](./check.md)         | `lint` | Prüft die Locale-Parität und wie der Code Wörterbücher verwendet    |
| [`dialex export`](./export.md)       |        | Exportiert Strings als JSON, CSV oder XLIFF für Übersetzer          |
| [`dialex import`](./import.md)       |        | Schreibt übersetzte Dateien zurück in die Wörterbücher              |
| [`dialex translate`](./translate.md) |        | Füllt fehlende Übersetzungen mit einem Machine-Translation-Provider |

Ein typischer Ablauf: `dialex check --fix`, um Platzhalter für neue Schlüssel anzulegen, dann entweder `dialex translate` oder `dialex export` / `dialex import` für menschliche Übersetzer, anschließend `dialex check` in der CI.
