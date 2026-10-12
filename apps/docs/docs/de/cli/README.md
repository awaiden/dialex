# CLI

`@dialexjs/cli` installiert zwei Binärdateien: `dialex` und den kürzeren Alias `dx`, praktisch in `package.json`-Skripten (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Befehl                                                       | Alias  | Zweck                                                               |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| [`dialex init`](./init.md)                                   |        | Richtet Dialex in einem Projekt ein                                 |
| [`dialex generate`](./generate.md)                           | `gen`  | Kompiliert Wörterbücher und Typdeklarationen                        |
| [`dialex check`](./check.md)                                 | `lint` | Prüft die Locale-Parität und wie der Code Wörterbücher verwendet    |
| [`dialex export`](./export.md)                               |        | Exportiert Strings als JSON, CSV oder XLIFF für Übersetzer          |
| [`dialex import`](./import.md)                               |        | Schreibt übersetzte Dateien zurück in die Wörterbücher              |
| [`dialex translate`](./translate.md)                         |        | Füllt fehlende Übersetzungen mit einem Machine-Translation-Provider |
| [`dialex lock`](./translate.md#keeping-translations-in-sync) |        | Hält Übersetzungen als aktuell zum Quelltext fest                   |

Ein typischer Ablauf: `dialex check --fix`, um Platzhalter für neue Schlüssel anzulegen, dann entweder `dialex translate` oder `dialex export` / `dialex import` für menschliche Übersetzer, anschließend `dialex check` in der CI.

## Native Binärdatei

Unter Linux, macOS und Windows (x64 und arm64) führen `dialex` und `dx` eine native, in Rust gebaute Binärdatei aus, die mit dem Paket als optionale Abhängigkeit (`@dialexjs/cli-<platform>`) installiert wird. `generate` und `check` sind bei einem Projekt mit 1.000 Wörterbüchern 25- bis 40-mal schneller als die Node-Implementierung und erzeugen dieselben Dateien und Ausgaben Byte für Byte.

Die native Binärdatei liest Wörterbücher und Konfiguration aus dem Syntaxbaum. Braucht ein Befehl die Ausführung des Projektcodes (eine Konfiguration, die nicht nur aus Daten besteht, ein `translate`-Provider, `runtime: true`, Lazy Loading, `--fix`, `--watch`) oder ist er nativ nicht umgesetzt (`init`, `export`, `import`, `lock`, `translate`), übergibt sie den ganzen Befehl an die Node-CLI, sodass sich für dich nichts ändert. Zwei Umgebungsvariablen steuern das:

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # native only: fail instead of falling back to Node
```

Mit npm und Yarn classic unter Linux und macOS legt der Installationsschritt die Binärdatei an die Stelle des Launchers, sodass `dx` in unter einer Millisekunde startet, statt zuerst Node zu booten (etwa 25 ms). Andere Paketmanager, `--ignore-scripts` und Windows behalten einen kleinen JavaScript-Launcher, der dieselbe Binärdatei ausführt.
