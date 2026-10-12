# Diagnose-Referenz

Jedes von Dialex gemeldete Problem hat einen Code, einen Schweregrad und eine Meldung. Dieselben Prüfungen laufen in [`dialex check`](../cli/check.md), in der [VS-Code-Erweiterung](./vscode.md) und im [Language Server](./zed.md); ein Problem sieht also überall gleich aus.

## Schweregrade

| Schweregrad | Bedeutung                                                     | In `dialex check`                                                                | Im Editor   |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| `error`     | Etwas ist falsch und schlägt zur Laufzeit oder im Review fehl | Exit-Code `1`                                                                    | Fehler      |
| `warning`   | Etwas ist wahrscheinlich falsch oder unfertig                 | Gemeldet, Exit-Code `0` (`--fail-on-stale` macht `stale-translation` zum Fehler) | Warnung     |
| `info`      | Eine Datei lässt sich nicht analysieren, was kein Fehler ist  | Nicht angezeigt                                                                  | Information |

`unused-key` und `unused-dictionary` sind in `check` Warnungen; Editoren zeigen sie als ausgeblendeten Text (ein Hinweis), damit sie das Problems-Panel nicht füllen, und nur bei eingeschalteter Einstellung `unusedKeys`.

## Wörterbuchdateien

| Code                 | Schweregrad | Meldung                                                                                 | Bedeutung und Lösung                                                                                                                                                                                                                        |
| -------------------- | ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-dictionary` | error       | `Failed to parse dictionary: ...`                                                       | Die Datei hat einen Syntaxfehler. Behebe die Syntax; die Meldung sagt, wo                                                                                                                                                                   |
| `invalid-dictionary` | error       | `Default export does not appear to be a valid defineDictionary output.`                 | Nur bei `runtime`-Analyse. `export default` muss `defineDictionary(...)` sein                                                                                                                                                               |
| `invalid-locale`     | error       | `Locale "x" content is empty or invalid.`                                               | Nur bei `runtime`-Analyse. Der Inhalt einer Locale muss ein Objekt sein                                                                                                                                                                     |
| `unanalyzable`       | info        | `This dictionary uses spreads, computed keys, imported values, or a computed name, ...` | Die statischen Werkzeuge können die Datei nicht lesen. `dialex check` führt sie stattdessen aus; Editoren überspringen sie. Nutze Objektliterale für Editor-Unterstützung (siehe [Wörterbücher](./dictionaries.md#what-the-tools-can-read)) |
| `missing-locale`     | error       | `Missing configured locale "de"`                                                        | Eine Locale aus `locales` hat in diesem Wörterbuch keinen Inhalt. Füge sie hinzu oder führe `dialex check --fix` aus                                                                                                                        |
| `missing-key`        | error       | `Locale "tr" is missing key "nav.about"`                                                | Eine andere Locale hat den Schlüssel. Füge ihn hinzu, führe `--fix` aus (kopiert den Wert mit `[TODO]`-Markierung) oder nutze den Quick Fix des Editors                                                                                     |
| `todo-placeholder`   | warning     | `Locale "tr" key "title" still has a [TODO] placeholder`                                | Ein Wert beginnt noch mit `[TODO] `, hinterlassen von `--fix`. Übersetze ihn oder führe [`dialex translate`](../cli/translate.md) aus                                                                                                       |
| `stale-translation`  | warning     | `Locale "tr" key "title" is out of date: the "en" text changed after it was translated` | Der Ausgangstext hat sich geändert, nachdem die Übersetzung in `dialex.lock.json` aufgezeichnet wurde. Aktualisiere die Übersetzung, dann `dialex lock`                                                                                     |

## ICU-Nachrichten

| Code                    | Schweregrad | Meldung                                                                                                                      | Bedeutung und Lösung                                                                                                                                         |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `invalid-icu`           | error       | `Invalid ICU message "a.items" (tr): ICU syntax error at 27: Missing required "other" option`                                | Der String nutzt `plural`, `select`, `number`... und lässt sich nicht parsen. Die Meldung nennt die Position. Plural und Select brauchen einen `other`-Zweig |
| `invalid-icu`           | warning     | `"a.soft" (en) contains braces but is not valid ICU, so t() values cannot be applied: ...`                                   | Ein String mit einfachen Klammern lässt sich nicht parsen, daher gäbe `t()` ihn unverändert zurück. Maskiere wörtliche Klammern: `'{'`                       |
| `icu-args-mismatch`     | error       | `Locale "tr" uses different arguments than "en" for "a.greeting" (expected name:any, found ad:any)`                          | Übersetzungen eines Schlüssels müssen dieselben Argumentnamen verwenden. Benenne das Argument in der Übersetzung um                                          |
| `icu-plural-categories` | warning     | `Locale "ru" plural "count" in "a.items" has no "few", "many" option (used by this language; "other" will be shown instead)` | Die Sprache braucht mehr Pluralkategorien, als die Nachricht liefert. Füge sie hinzu                                                                         |

## Quellcode

Dafür braucht es zu durchsuchende Quelldateien; ohne sie werden sie übersprungen. Was durchsucht wird, steht unter [`dialex check`](../cli/check.md#what-it-checks).

| Code                 | Schweregrad | Meldung                              | Bedeutung und Lösung                                                                                                                                                       |
| -------------------- | ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-dictionary` | error       | `Unknown dictionary "zzz"`           | `getDictionary("zzz")`, `useDictionary("zzz")` oder `@DialexDictionary("zzz")` nennt ein nicht vorhandenes Wörterbuch                                                      |
| `unknown-path`       | error       | `Unknown translation path "a.nope"`  | `t("a.nope")`, wobei `a` ein bekanntes Wörterbuch ohne diesen Schlüssel ist. Der Editor bietet einen Quick Fix, der den Schlüssel in jeder Locale ergänzt                  |
| `unused-key`         | warning     | `Key "only_en" is possibly unused`   | Keine Quelldatei enthält das letzte Segment des Schlüssels als Wort. Eine Heuristik: dynamischer Zugriff wird nie gemeldet, manche ungenutzten Schlüssel bleiben unbemerkt |
| `unused-dictionary`  | warning     | `Dictionary "c" is never referenced` | Keine Quelldatei enthält den Namen des Wörterbuchs                                                                                                                         |

## Generierte Dateien

`dialex check` vergleicht außerdem `dialex.generated.ts` und `dialex-env.d.ts` mit dem, was `dialex generate` schreiben würde, ohne Formatierung zu beachten. Dieses Problem hat keinen Code:

| Schweregrad | Meldung                                                                                | Lösung                      |
| ----------- | -------------------------------------------------------------------------------------- | --------------------------- |
| error       | `Out of date with your dictionaries or config. Run `dx generate`(or`dx check --fix`).` | Führe `dialex generate` aus |

## Ausgabeformate

Die **menschenlesbare** Ausgabe gruppiert Probleme nach Datei, mit der Zeilennummer hinter jeder Meldung.

**`--json`** gibt ein Objekt und sonst nichts aus:

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

| Feld            | Beschreibung                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`       | `false`, wenn es mindestens einen Fehler gibt. Der Exit-Code ist dann `1`                                                                                                                                   |
| `diagnostics`   | Ein Eintrag je Datei mit Problem: `file` (relativ zum Projekt), `name` (das Wörterbuch, falls es eines ist), `errors`, `warnings` und `annotations` (`level`, `message`, einsbasierte `line`, wenn bekannt) |
| `totalIssues`   | Die Anzahl der Fehler                                                                                                                                                                                       |
| `totalWarnings` | Die Anzahl der Warnungen                                                                                                                                                                                    |
| `fixed`         | Wie viele Werte `--fix` eingefügt hat                                                                                                                                                                       |

**`--github`** gibt je Annotation einen Workflow-Befehl aus (`::error file=...,line=...,title=dialex::message`), den GitHub an den Dateien eines Pull Requests anzeigt.
