# dialex check

Prüft deine Wörterbücher und wie dein Code sie verwendet. Es beendet sich mit Code `1`, wenn es Fehler findet, und eignet sich daher für Pre-Commit-Hooks und die CI. Warnungen lassen den Lauf nie fehlschlagen.

```bash
dialex check
dialex check --json
dialex check --github
dialex check --fix
dialex lint -c ./dialex.config.ts
```

## Was geprüft wird

**Fehler**

- In einem Wörterbuch fehlt ein konfiguriertes Locale.
- In einem Locale fehlt ein Schlüssel, den ein anderes Locale hat. Verschachtelte Schlüssel werden über ihren Punktpfad verglichen, zum Beispiel `nav.about`.
- Ein String, der eindeutig [ICU](../guide/icu.md) verwendet (`plural`, `select`, `number`, ...), ist kein gültiges ICU, oder ein Locale verwendet für denselben Schlüssel andere Argumente als das Standard-Locale.
- Quellcode ruft `getDictionary("x")`, `useDictionary("x")` oder `@I18nDictionary("x")` mit einem Wörterbuch auf, das nicht existiert.
- Quellcode ruft `t("home.nav.missing")` mit einem Pfad auf, der nicht existiert. Es werden nur `t()`-Aufrufe geprüft, deren erstes Segment ein bekannter Wörterbuchname ist; fremde `t()`-Funktionen werden daher ignoriert.

**Warnungen**

- Ein Schlüssel wird möglicherweise nicht verwendet. Das ist eine Heuristik: Ein Schlüssel gilt als verwendet, wenn sein letztes Segment irgendwo in deinem Quellcode als Wort vorkommt. So verursacht dynamischer Zugriff nie einen falschen Fehler, und manche ungenutzten Schlüssel bleiben unbemerkt.
- Ein Wörterbuch wird nie referenziert.
- Eine ICU-Nachricht verwendet einfache `{placeholders}`, lässt sich aber nicht als ICU parsen, oder für eine Sprache fehlt eine Plural-Option (zum Beispiel `few` im Russischen).
- Ein String beginnt noch mit `[TODO]`, hinterlassen von `--fix` oder einer abgelehnten Übersetzung.

Die Prüfungen auf Referenzen und ungenutzte Schlüssel durchsuchen `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}` und überspringen `node_modules`, Build-Ausgaben, `*.d.ts`, generierte Dateien, Konfigurationsdateien und die Wörterbücher selbst. Sie entfallen, wenn es keinen Quellcode zum Durchsuchen gibt.

## Optionen

| Option                | Beschreibung                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | Eigener Konfigurationspfad                                                                                           |
| `--json`              | Gibt maschinenlesbares JSON aus (`success`, `totalIssues`, `totalWarnings`, `fixed`, `diagnostics`) und sonst nichts |
| `--github`            | Gibt zusätzlich GitHub-Actions-Annotationen aus (`::error file=...,line=...::message`)                               |
| `--fix`               | Fügt vor der Prüfung fehlende Schlüssel ein                                                                          |
| `--src <globs...>`    | Quellcode-Globs, die statt der Standardwerte durchsucht werden                                                       |

## --fix

Für jeden Schlüssel, den ein Locale hat und ein anderes nicht, kopiert `--fix` den Wert des Standard-Locales an die fehlende Stelle. Strings erhalten das Präfix `[TODO] `, damit sie leicht zu finden sind; Funktionen werden unverändert kopiert. Fehlende konfigurierte Locales werden angelegt. Die Änderungen erfolgen am Syntaxbaum, daher bleiben Kommentare und der Rest der Datei erhalten.

Führe anschließend [`dialex translate`](./translate.md) aus, um die Platzhalter durch echte Übersetzungen zu ersetzen.

## GitHub Actions

```yaml
- run: bunx dialex check --github
```

Fehler und Warnungen erscheinen als Annotationen an den Dateien und Zeilen, auf die sie sich beziehen.
