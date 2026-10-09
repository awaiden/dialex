# VS-Code-Erweiterung

Die Dialex-Erweiterung bringt Editor-Unterstützung für Übersetzungen: Diagnosen, Hover, Gehe zu Definition, Autovervollständigung und Schnellkorrekturen. Sie liegt im Repository unter `packages/vscode`.

::: warning Status
Die Erweiterung lässt sich bauen und zu einer `.vsix` packen, und ihre Logik wird von Tests abgedeckt, die gegen einen Ersatz für die VS-Code-API laufen. Sie wurde **noch nicht in einem echten VS-Code-Fenster ausprobiert** und ist nicht im Marketplace veröffentlicht. Folge [Ausprobieren](#try-it-out), um sie selbst auszuführen, und melde alles, was falsch aussieht.
:::

## Installation

Baue und packe die Erweiterung und installiere dann die `.vsix`:

```bash
cd packages/vscode
bun run build
bun run package                      # creates dialex-vscode-0.1.0.vsix
code --install-extension dialex-vscode-0.1.0.vsix
```

## Funktionen

### Diagnosen

Probleme werden dort unterstrichen, wo sie auftreten:

| Wo                       | Problem                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eine `.content.ts`-Datei | Einem Locale fehlt ein Schlüssel, den ein anderes Locale hat, oder ein konfiguriertes Locale fehlt; ungültiges [ICU](./icu.md); Argumente, die sich zwischen Locales unterscheiden; `[TODO]`-Platzhalter, die `dialex check --fix` hinterlassen hat; Übersetzungen, deren Quelltext sich seit der Übersetzung geändert hat |
| Quellcode                | `getDictionary("x")` oder `t("x.y")`, die ins Leere zeigen                                                                                                                                                                                                                                                                 |

Für eine Sprache fehlende Plural-Kategorien (zum Beispiel `few` im Russischen) werden als Warnungen gemeldet. Ist `dialex.unusedKeys` aktiv, werden Schlüssel und Wörterbücher ausgegraut, die keine Quelldatei zu verwenden scheint.

### Hover

Bewege den Mauszeiger über einen Schlüssel in `t("home.title")`, einen Wörterbuchnamen in `getDictionary("home")` oder einen Member des Aufrufs, etwa `.title` in `getDictionary("home").title`. Eine Tabelle zeigt den Text in jedem Locale (zuerst das Standard-Locale) und markiert Locales, in denen er fehlt. Funktionswerte zeigen ihren Quellcode.

### Gehe zu Definition

`F12` oder Strg/Cmd-Klick auf einen Schlüssel springt dorthin, wo er im Wörterbuch geschrieben steht (zum Eintrag des Standard-Locales oder zum ersten Locale, das ihn hat).

### Autovervollständigung

Innerhalb des Strings von `t("…")`, `getDictionary("…")`, `useDictionary("…")` oder `@DialexDictionary("…")`:

- Wörterbuchnamen, mit der Anzahl der Schlüssel und Locales;
- nach `t("home.` die Schlüssel dieser Ebene, mit dem Text des Standard-Locales als Vorschau. Gruppen werden mit einem Punkt fortgesetzt und öffnen die Liste erneut.

### Schnellkorrekturen

Nutze die Glühbirne (`Strg+.`/`Cmd+.`) an einer Diagnose:

- **Add "nav.contact" to tr (marked [TODO])** kopiert den Wert aus dem Standard-Locale, wie [`dialex check --fix`](../cli/check.md#fix).
- **Add all N missing keys** erledigt das für die ganze Datei.
- **Add "nav.pricing" to the "home" dictionary** (bei einem unbekannten `t()`-Pfad) legt den Schlüssel in jedem Locale als `[TODO]`-Platzhalter an.

Korrekturen ersetzen den Text der Datei im Editor, sodass sie sich rückgängig machen lassen und nichts geschrieben wird, bis du speicherst.

## Einstellungen

| Einstellung           | Standard | Beschreibung                                                                                                                                                                  |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialex.enable`       | `true`   | Schaltet alle Funktionen ein oder aus                                                                                                                                         |
| `dialex.unusedKeys`   | `false`  | Graut möglicherweise ungenutzte Schlüssel und Wörterbücher aus. Es ist eine Heuristik auf Basis von Wortübereinstimmung und daher standardmäßig aus                           |
| `dialex.autoGenerate` | `true`   | Erzeugt `dialex.generated.ts` und `dialex-env.d.ts` neu, wenn sich ein Wörterbuch oder eine Konfigurationsdatei ändert, in Projekten, die bereits eine generierte Datei haben |
| `dialex.configPath`   | `""`     | Pfad der Konfigurationsdatei relativ zum Stamm jedes Projekts                                                                                                                 |

Der Befehl **Dialex: Refresh Diagnostics** analysiert alles neu. Diagnosen werden auch aktualisiert, wenn du eine Datei speicherst oder sich ein Wörterbuch oder eine Konfigurationsdatei ändert.

Der Befehl **Dialex: Regenerate dialex.generated.ts** macht das auf Abruf. Die automatische Erzeugung liest die Konfiguration aus dem Syntaxbaum und führt sie nie aus, wird in nicht vertrauenswürdigen Arbeitsbereichen übersprungen und berührt nur Projekte, die bereits eine generierte Datei haben, legt also nie Dateien an, die du nicht wolltest.

## Projekte

Ein Projekt ist ein Ordner mit einer `dialex.config.*` oder `i18n.config.*`. Ein Wörterbuch, das kein konfiguriertes Projekt enthält, gehört mit Standardeinstellungen zum nächstgelegenen Ordner mit einer `package.json`. In einem Monorepo wird jedes Projekt für sich analysiert, und ein Wörterbuch gehört zum nächstgelegenen.

## Dein Code wird nie ausgeführt

Die Erweiterung liest deine Konfiguration und deine Wörterbücher aus dem Syntaxbaum und **führt niemals Projektcode aus**. Deshalb kann sie Unterstützung für nicht vertrauenswürdige Arbeitsbereiche erklären, und es ist wichtig, weil Konfigurationsdateien und Wörterbücher Code sind.

Der Preis dafür: Es werden nur statisch sichtbare Werte verstanden:

- In `dialex.config` müssen `defaultLocale`, `locales`, `include`, `fallbacks`, `prefixDefault` und `lazy` Literale sein. Alles Berechnete wird ignoriert und im Ausgabekanal **Dialex** vermerkt.
- Ein Wörterbuch, das Spreads, berechnete Schlüssel oder importierte Werte verwendet, lässt sich nicht analysieren. Es erhält statt Diagnosen einen Hinweis. [`dialex check`](../cli/check.md) importiert solche Dateien und prüft sie.

Dieselbe Analyse steht programmatisch als `@dialexjs/cli/api` zur Verfügung (`analyzeProject`, `readStaticConfig` und die Helfer zum Bearbeiten von Wörterbüchern).

<a id="try-it-out"></a>

## Ausprobieren

So führst du die Erweiterung aus dem Quellcode in einem echten VS-Code-Fenster aus:

1. Öffne den Ordner `packages/vscode` in VS Code.
2. Drücke `F5` ("Run Extension (examples)"). Das baut die Erweiterung und öffnet ein zweites Fenster mit dem Ordner `examples/` des Repositorys.
3. Öffne in diesem Fenster ein Beispiel, zum Beispiel `examples/react/src`:
   - Lösche einen Schlüssel aus dem `tr`-Block von `home.content.ts`: Unter `tr` erscheint eine rote Wellenlinie, und die Schnellkorrektur fügt den Schlüssel wieder ein.
   - Bewege den Mauszeiger über einen `t("home.…")`-Aufruf oder drücke darauf `F12`.
   - Tippe `t("home.` in eine `.tsx`-Datei und sieh dir die Vorschläge an.
4. Öffne den Ausgabekanal **Dialex** für Hinweise zu allem, was nicht statisch gelesen werden konnte.
