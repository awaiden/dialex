# Native Binärdateien

`dialex generate`, `dialex check` und der Language Server haben eine native Implementierung in Rust. Sie liest dieselben Wörterbücher aus dem Syntaxbaum und die Konfiguration aus `.dialex/config.json` und erzeugt **dieselben Dateien und dieselbe Ausgabe, Byte für Byte**; sie ist nur schneller. Jeder andere Befehl und jeder Fall, den der native Code nicht allein entscheiden kann, läuft wie bisher in der Node-CLI. Du musst nichts auswählen: Installiere `@dialexjs/cli`, und das Richtige passiert.

## Geschwindigkeit

Gemessen mit jeweils den besten von 5 frischen Prozessen auf einer Maschine (Intel Core i5-11400H); deine Zahlen werden abweichen, führe `apps/benchmarks/cli/run.mjs` also auf deiner Hardware aus.

| Projekt            | Befehl     | Node-CLI | Native Binärdatei |
| ------------------ | ---------- | -------: | ----------------: |
| 100 Wörterbücher   | `generate` |   341 ms |            4,3 ms |
| 100 Wörterbücher   | `check`    |   492 ms |            8,9 ms |
| 1.000 Wörterbücher | `generate` | 1.107 ms |             28 ms |
| 1.000 Wörterbücher | `check`    | 2.149 ms |             88 ms |

Der Language Server analysiert 1.000 Wörterbücher in etwa 50 ms statt in etwa 2,7 s und analysiert nach einer Änderung in etwa 20 ms neu.

## Welche Plattformen

Vorgebaute Binärdateien werden als optionale Abhängigkeiten von `@dialexjs/cli` veröffentlicht:

| Plattform                     | Paket                                                    |
| ----------------------------- | -------------------------------------------------------- |
| Linux x64 und arm64 (glibc)   | `@dialexjs/cli-linux-x64`, `@dialexjs/cli-linux-arm64`   |
| macOS Intel und Apple Silicon | `@dialexjs/cli-darwin-x64`, `@dialexjs/cli-darwin-arm64` |
| Windows x64 und arm64         | `@dialexjs/cli-win32-x64`, `@dialexjs/cli-win32-arm64`   |

Alpine Linux (musl) und andere Plattformen haben keine Binärdatei und nutzen die Node-CLI. Das gilt auch für eine Installation mit `--no-optional`.

## Wie gewählt wird

`dx` ist ein kleiner Launcher. Ist das Plattformpaket installiert, führt er die Binärdatei aus; sonst die Node-CLI. Mit npm und Yarn classic unter Linux und macOS geht der Installationsschritt weiter und legt die Binärdatei an die Stelle des Launchers, sodass `dx` startet, ohne zuerst Node zu booten (unter 1 ms statt etwa 25 ms). Bei `--ignore-scripts`, pnpm, Bun (das Lifecycle-Skripte standardmäßig blockiert) oder Windows bleibt der Launcher und führt dieselbe Binärdatei aus.

## Was nativ läuft

| Befehl                                          | Nativ                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `dialex generate`                               | Ja, für eager (nicht lazy) Projekte mit `-o`, `-c` und `--json`   |
| `dialex check`                                  | Ja, mit `-c`, `--json`, `--github`, `--fail-on-stale` und `--src` |
| `--version`                                     | Ja                                                                |
| Language Server                                 | Ja, optional mit `DIALEX_NATIVE=1` (siehe unten)                  |
| `init`, `export`, `import`, `lock`, `translate` | Nein: Node-CLI                                                    |
| `generate --watch`, `check --fix`, `lazy`-Laden | Nein: Node-CLI                                                    |

Ein Befehl läuft außerdem in Node, wenn der native Code auf etwas trifft, das er nicht raten darf:

- eine `dialex.config.*` mit Spreads, berechneten Schlüsseln oder Nicht-Literalen (die Node-CLI führt die Datei aus);
- ein Wörterbuch mit Spreads, berechneten Schlüsseln, importierten Werten oder einem berechneten Namen;
- ein Glob oder Locale-Tag, den er nicht exakt deuten kann.

Das Ergebnis ist immer dasselbe wie ohne die native Binärdatei; es ist nur nicht schneller.

## Umgebungsvariablen

| Variable                                            | Verwendet von               | Wirkung                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DIALEX_NATIVE=0`                                   | CLI, Language Server        | Immer die Node-Implementierung verwenden                                                                                                                                                                                                                                             |
| `DIALEX_NATIVE=1`                                   | CLI                         | Wenn `generate` oder `check` nicht nativ möglich ist, mit Exit-Code 1 und einem Grund enden, statt in Node zu laufen. Nützlich in CI, um ein Wörterbuch zu finden, das den Geschwindigkeitsvorteil stillschweigend verliert. Befehle, die nur Node kennen, laufen wie üblich in Node |
| `DIALEX_NATIVE=1`                                   | Language Server             | Den nativen Server ausführen. Ohne sie läuft der Node-Server                                                                                                                                                                                                                         |
| `DIALEX_BINARY=/path/to/dx`                         | CLI-Launcher                | Diese Binärdatei statt des installierten Plattformpakets verwenden                                                                                                                                                                                                                   |
| `DIALEX_LSP_BINARY=/path/to/dialex-language-server` | `@dialexjs/language-server` | Diese Server-Binärdatei verwenden                                                                                                                                                                                                                                                    |
| `DIALEX_NODE_CLI=/path/to/index.mjs`                | native Binärdatei           | Die Node-CLI, an die Befehle übergeben werden. Der Launcher setzt sie; setze sie nur selbst, wenn du die Binärdatei allein ausführst                                                                                                                                                 |
| `DIALEX_SKIP_NATIVE_INSTALL=1`                      | Installationsschritt        | Den JavaScript-Launcher behalten, statt ihn durch die Binärdatei zu ersetzen                                                                                                                                                                                                         |
| `NO_COLOR`                                          | CLI                         | Ohne Farben ausgeben                                                                                                                                                                                                                                                                 |

## Den nativen Language Server nutzen

Der Language Server ist vorerst optional. Setze `DIALEX_NATIVE=1` in der Umgebung, die ihn startet; `@dialexjs/language-server` führt dann die Binärdatei aus dem Plattformpaket aus. In Zed kannst du stattdessen `lsp.dialex.binary.path` auf die Binärdatei setzen. Er bietet dieselben Diagnosen, Hover, Gehe-zu-Definition, Vervollständigung und Quick Fixes wie der Node-Server. Er generiert `dialex.generated.ts` für Projekte mit Lazy Loading nicht neu; führe dafür `dialex generate` aus.

## Prüfen, was lief

`dialex --version` gibt in beiden Fällen dieselbe Nummer aus. Um zu sehen, ob ein Befehl nativ ausgeführt wurde, führe ihn mit `DIALEX_NATIVE=1` aus: Gibt er seine normale Ausgabe aus, lief er nativ; endet er mit `dialex: native check declined: ...`, steht der Grund in der Meldung, und ohne die Variable wäre er in Node gelaufen.
