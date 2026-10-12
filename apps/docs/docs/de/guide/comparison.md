# Vergleich

Wie sich Dialex von den Bibliotheken unterscheidet, mit denen es am häufigsten verglichen wird: [i18next](https://www.i18next.com), [FormatJS](https://formatjs.github.io) (`react-intl` und `intl-messageformat`) [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) und [Intlayer](https://intlayer.org). Alle sind gute Bibliotheken, und die richtige hängt davon ab, wie dein Team Text schreibt und übersetzt.

Zahlen zu Geschwindigkeit und Größe findest du unter [Benchmarks](./benchmarks.md).

## Auf einen Blick

| Frage                    | Dialex                                          | i18next                                  | FormatJS                           | Lingui                                                            |
| ------------------------ | ----------------------------------------------- | ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| Wo der Text liegt        | TypeScript-Wörterbücher neben dem Code          | JSON-Ressourcen, nach Namespace geladen  | Nachrichten im Code, plus Kataloge | Nachrichten im Code, in Kataloge extrahiert                       |
| Nachrichtensyntax        | ICU MessageFormat oder eine TypeScript-Funktion | Eigenes `{{value}}` und Plural-Schlüssel | ICU MessageFormat                  | ICU MessageFormat                                                 |
| Typisierte Schlüssel     | Aus deinen Wörterbüchern generiert              | Über Typdeklarationen der Ressourcen     | Nachrichten-IDs sind Strings       | Keine Schlüssel: der Quelltext ist die ID                         |
| Typisierte ICU-Argumente | Aus jeder Nachricht generiert                   | Nicht Teil der Schlüsseltypen            | Standardmäßig nicht                | Die Werte stammen aus dem Template, daher prüft TypeScript sie    |
| Fehlende Übersetzungen   | `dialex check` lässt den Build scheitern        | Zur Laufzeit gemeldet, mit Fallbacks     | Über `onError` gemeldet            | Von `lingui extract` gezählt; `lingui compile --strict` scheitert |
| Extraktionsschritt       | Keiner: die Wörterbücher sind die Quelle        | Optionale Werkzeuge                      | `formatjs extract`                 | `lingui extract`                                                  |
| Übergabe an Übersetzer   | Export und Import als JSON, CSV und XLIFF       | JSON, viele Dienste binden sich an       | JSON, in mehreren Anbieterformaten | PO- und JSON-Kataloge                                             |
| Lazy Loading             | Pro Wörterbuch oder pro Locale, generiert       | Backends und Namespaces                  | Eigene dynamische Imports          | Eigene dynamische Imports                                         |

Die Zellen beschreiben die dokumentierten Standardwerte jeder Bibliothek. Jede lässt sich mit Plugins oder eigenem Code erweitern.

## Dialex und i18next

i18next ist die am weitesten verbreitete i18n-Bibliothek für JavaScript, mit einem großen Ökosystem aus Backends, Spracherkennern und Framework-Anbindungen. Es hält Übersetzungen als JSON-Ressourcen und bietet Laufzeitfunktionen wie Namespaces, Fallbacks und Plugins.

Dialex trifft eine andere Abwägung. Wörterbücher sind TypeScript und werden zu einer typisierten Registry kompiliert, sodass ein falscher Schlüssel oder ein falsches Argument ein Typfehler ist und ein fehlendes Locale `dialex check` vor dem Release scheitern lässt. Es gibt kein Laden von Ressourcen zur Laufzeit zu konfigurieren; mit [Lazy Loading](./lazy-loading.md) ist ein Wörterbuch ein per Code-Splitting abgetrenntes Modul.

Wähle i18next, wenn du sein Plugin-Ökosystem brauchst, Backends, die Übersetzungen zur Laufzeit laden, oder eine Laufzeit, die nicht an TypeScript gebunden ist. Wähle Dialex, wenn der Compiler deinen Text bewachen soll.

## Dialex und FormatJS

FormatJS ist die Referenzimplementierung von ICU MessageFormat für JavaScript, und `react-intl` baut darauf React-Komponenten auf. Nachrichten werden im Code mit `defineMessages` oder `formatMessage` definiert, mit der `formatjs`-CLI extrahiert und können vorkompiliert werden.

Dialex verwendet dieselbe Nachrichtensyntax, daher lassen sich ICU-Nachrichten übernehmen. Der Unterschied liegt im Workflow drumherum: Dialex braucht keinen Extraktionsschritt, weil das Wörterbuch die Quelle ist, und es generiert Typen für Schlüssel und Argumente. Die Laufzeit ist außerdem kleiner, wie unter [Benchmarks](./benchmarks.md) gezeigt.

Wähle FormatJS, wenn du die Standardimplementierung und ihre React-Komponenten willst oder dein Übersetzungsprozess auf `formatjs extract` aufbaut.

## Dialex und Lingui

Lingui hält die Nachricht im Quellcode (Makros `t` und `Trans`), extrahiert Kataloge nach PO oder JSON und kompiliert sie zu einer kleinen Laufzeit. Das Ergebnis ist ein sehr kleines Bundle und ein Schreibstil, bei dem der englische Text in der Komponente steht.

Dialex hält den Text stattdessen in Wörterbüchern, sodass ein Schlüssel seinen Zweck benennt und jedes Locale in der Datei neben den anderen steht. Beide Ansätze verwenden ICU MessageFormat.

Wähle Lingui, wenn du Nachrichten lieber inline schreibst und einen PO-basierten Übersetzungsprozess hast. Wähle Dialex, wenn du benannte Schlüssel bevorzugst und sie vom Typsystem prüfen lassen willst.

## Paraglide JS und Intlayer auf einen Blick

Zwei weitere Bibliotheken, die ebenfalls zur Build-Zeit arbeiten, neben Dialex:

| Frage                    | Dialex                                          | Paraglide JS                                                   | Intlayer                                                      |
| ------------------------ | ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Wo der Text liegt        | TypeScript-Wörterbücher neben dem Code          | JSON-Nachrichtendateien pro Locale                             | `.content`-Dateien neben den Komponenten                      |
| Nachrichtensyntax        | ICU MessageFormat oder eine TypeScript-Funktion | Inlang-Format; ICU MessageFormat 1 und i18next per Plugin      | Eigene Knoten (`t`, `plural`, `enu`, `select`) oder ICU       |
| Typisierte Schlüssel     | Aus deinen Wörterbüchern generiert              | Jede Nachricht ist eine generierte Funktion                    | Über einen `Dictionary`-Typ an jeder Deklaration              |
| Typisierte ICU-Argumente | Aus jeder Nachricht generiert                   | Die Parameter der generierten Funktionen sind typisiert        | In der Dokumentation nicht behandelt                          |
| Fehlende Übersetzungen   | `dialex check` lässt den Build scheitern        | Die inlang-CLI prüft Übersetzungen in der CI                   | `intlayer content test` prüft darauf                          |
| Extraktionsschritt       | Keiner: die Wörterbücher sind die Quelle        | Keiner: Nachrichten werden in den JSON-Dateien geschrieben     | `intlayer extract` verschiebt Strings aus Komponenten         |
| Übergabe an Übersetzer   | Export und Import als JSON, CSV und XLIFF       | Fink-Editor für Nicht-Entwickler; Import und Export per Plugin | CMS und Editor, `fill` mit KI, JSON- und YAML-Dateien         |
| Lazy Loading             | Pro Wörterbuch oder pro Locale, generiert       | Ungenutzte Nachrichten entfernt der Bundler                    | `importMode`: `static`, `dynamic` oder `fetch` pro Wörterbuch |

## Dialex und Paraglide JS

[Paraglide JS](https://paraglidejs.com) ist ein Compiler aus dem inlang-Projekt. Nachrichten liegen in JSON-Dateien, und der Compiler macht aus jeder eine Funktion (`m.greeting({ name })`) mit typisierten Parametern, sodass ein Bundler nicht genutzte Nachrichten entfernen kann. Das Nachrichtenformat ist austauschbar: Standard ist das inlang-Format, und Plugins ergänzen ICU MessageFormat 1 und i18next-Dateien.

Dialex generiert ebenfalls Typen aus deinen Nachrichten, hält aber den Text eines Features in einem Wörterbuch zusammen, mit allen Locales nebeneinander, und führt ICU-Strings in einer kleinen Laufzeit aus. Die Funktionen pro Nachricht von Paraglide ermöglichen das feinste Tree-Shaking; das [Lazy Loading](./lazy-loading.md) von Dialex teilt nach Wörterbuch oder nach Locale.

Wähle Paraglide JS, wenn Tree-Shaking pro Nachricht am wichtigsten ist oder du die Editor-Werkzeuge von inlang willst. Wähle Dialex, wenn du Wörterbücher nach Feature gruppierst, ICU-Strings und Funktionsnachrichten in einer Datei willst und eine Paritätsprüfung über Locales hinweg.

## Dialex und Intlayer

[Intlayer](https://intlayer.org) deklariert Inhalte in `.content`-Dateien neben jeder Komponente (TypeScript, JSON, YAML oder Markdown), jeweils mit einem `key`, und baut daraus Wörterbücher. Darum herum bietet es ein CMS und einen Editor, `fill`, um Übersetzungen per KI zu vervollständigen, `extract`, um Strings aus Komponenten zu verschieben, und `content test`, um fehlende Übersetzungen zu finden.

Dialex hält Text ebenfalls in `*.content.ts`-Dateien neben dem Code, bleibt aber eine Bibliothek und ein Kommandozeilenwerkzeug: Nachrichten sind einfache ICU-Strings oder Funktionen, und der einzige Dienst, mit dem es spricht, ist der, den du für `dialex translate` wählst.

Wähle Intlayer, wenn du einen Editor für Nicht-Entwickler willst, Inhalte pro Komponente mit eigenen Knotentypen und KI-Befüllung im Workflow. Wähle Dialex, wenn du Standard-ICU-MessageFormat und keinen gehosteten Dienst willst.

## Wann Dialex nicht die richtige Wahl ist

- Du musst Übersetzungen zur Laufzeit aus einem Dienst laden oder ändern, ohne Deployment.
- Deine Übersetzer arbeiten in einem Werkzeug, das nur PO-Dateien liest, und du willst keinen Konvertierungsschritt. Dialex exportiert JSON, CSV und XLIFF.
- Dein Projekt ist reines JavaScript. Der Hauptnutzen von Dialex sind die Typen, die es generiert.
- Du hängst von einem Ökosystem-Plugin ab, das nur i18next, FormatJS oder Lingui bieten.

## Umstieg auf Dialex

- Behalte deine ICU-Nachrichten, wie sie sind; die Syntax ist dieselbe.
- Mache aus jedem Namespace oder Katalog eine `defineDictionary`-Datei und lass `dialex check` die Schlüssel finden, die sich zwischen Locales unterscheiden.
- Importiere bestehende Übersetzungen mit [`dialex import`](../cli/import.md) aus JSON, CSV oder XLIFF.
