# Wie Dialex funktioniert

Dialex hält deine Übersetzungen in TypeScript, verwandelt sie vor dem Start deiner App in ein generiertes Modul und Typdeklarationen und liest sie mit einfachen Objektzugriffen zurück. Diese Seite ist die Landkarte: Einmal gelesen, ordnet sich der Rest der Doku ein.

## Die Pipeline

```text
  src/home.content.ts            dialex generate              your app at runtime
  ┌────────────────────┐        ┌──────────────────┐        ┌───────────────────────┐
  │ defineDictionary(  │  ───►  │ dialex.generated │  ───►  │ adapter or provider   │
  │   "home", { en,tr })│        │   .ts            │        │ resolves the locale   │
  └────────────────────┘        │ dialex-env.d.ts  │        │ getDictionary / t()   │
        you write                └──────────────────┘        └───────────────────────┘
                                    CLI, build time              runtime, per request
```

1. **Du schreibst Wörterbücher.** Eine Datei `*.content.ts` je Wörterbuch, neben dem Code, der sie nutzt, jeweils ein Aufruf `defineDictionary("name", { en: {...}, tr: {...} })`. Siehe [Wörterbücher](./dictionaries.md).
2. **`dialex generate` kompiliert sie.** Es liest die Dateien aus ihrem Syntaxbaum (es führt deinen Code nicht aus), schreibt `dialex.generated.ts` (die Wörterbücher und eine clientsichere Kopie deiner Konfiguration) und `dialex-env.d.ts` (die Typen). Siehe [`dialex generate`](../cli/generate.md).
3. **Ein Adapter löst die Locale auf.** Auf einem Server schaut er auf URL, Query-String, Cookie und `Accept-Language`; in einem UI-Framework hält ein Provider die aktive Locale. Siehe [Locale-Erkennung](./locale-detection.md).
4. **Dein Code liest ein Wörterbuch.** `getDictionary("home").title`, `t("home.title")` oder ein Hook. Das ist ein Objektzugriff, plus ICU-Formatierung, wenn du Werte übergibst.

Zur Laufzeit durchsucht nichts das Dateisystem, und nichts wird zweimal geparst: ICU-Nachrichten werden bei der ersten Verwendung einmal kompiliert.

## Was jedes Teil ist

| Teil              | Was es ist                                                                                                   | Wo es liegt                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Wörterbuch        | Ein benanntes Objekt, das jede Locale auf ihren Inhalt abbildet: Strings, verschachtelte Objekte, Funktionen | `*.content.ts`                            |
| Schlüsselpfad     | Die Adresse eines Werts: `home.nav.about` ist Wörterbuch `home`, Schlüssel `nav.about`                       | In `t("home.nav.about")`                  |
| Konfiguration     | `defaultLocale`, `locales`, `fallbacks`, `lazy`, `translate`...                                              | `dialex.config.ts`                        |
| Generiertes Modul | Die Wörterbücher und Einstellungen als eine importierbare Datei                                              | `dialex.generated.ts` (nicht bearbeiten)  |
| Typdeklarationen  | Erweitern `DictionaryRegistry`, damit Namen und Pfade vervollständigt und geprüft werden                     | `dialex-env.d.ts` (nicht bearbeiten)      |
| Adapter           | Framework-Anbindung: löst die Locale auf und gibt dir `getDictionary` und `t`                                | `dialexjs/<framework>`                    |
| CLI               | `generate`, `check`, `export`, `import`, `translate`, `lock`, `init`                                         | `@dialexjs/cli`                           |
| Editor-Werkzeuge  | Diagnosen, Hover, Gehe zu Definition, Vervollständigung und Quick Fixes, aus derselben Analyse wie `check`   | VS-Code-Erweiterung, Language Server, Zed |

## Was wann entschieden wird

| Entschieden bei     | Was                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Schreibzeit         | Welche Schlüssel existieren und welchen Typ jeder hat                                                                              |
| `dialex generate`   | Das generierte Modul und die Typen. Eine Änderung an einem Wörterbuch oder der Konfiguration wird erst nach erneutem Lauf sichtbar |
| `dialex check` (CI) | Ob jede Locale jeden Schlüssel hat, ob ICU-Nachrichten gültig und konsistent sind, ob Code auf echte Schlüssel verweist            |
| Request oder Render | Die Locale und damit, welcher Inhalt gelesen wird; ICU-Werte werden hier formatiert                                                |

Weil die Typen aus der generierten Datei stammen, ist **ein vergessenes `dialex generate` die häufigste Ursache für „die Typen stimmen nicht“**. Führe während der Entwicklung `dialex generate --watch` aus, nutze die Editor-Erweiterung (sie generiert beim Speichern neu) und lass `dialex check` die CI fehlschlagen, wenn die Datei veraltet ist.

## Die drei Arten, eine Nachricht auszudrücken

| Form             | Beispiel                                                 | Wofür                                                                                          |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Einfacher String | `title: "Welcome"`                                       | Text ohne Werte                                                                                |
| ICU-String       | `items: "{count, plural, one {# item} other {# items}}"` | Werte, Plurale, Selects, Zahlen und Datumswerte; funktioniert mit Übersetzer-Werkzeugen        |
| Funktion         | `` greeting: (name: string) => `Hello, ${name}!` ``      | Volles TypeScript, einschließlich `plural()` und der anderen [Formatter](../api/formatting.md) |

Alle drei können im selben Wörterbuch stehen. Siehe [ICU-Nachrichten](./icu.md) und [Formatierung & Plurale](./formatting.md).

## Wie es weitergeht

- Ein Projekt starten: [Erste Schritte](./getting-started.md), dann dein [Framework](../frameworks/README.md).
- Etwas nachschlagen: die [API-Referenz](../api/README.md) und die [CLI-Referenz](../cli/README.md).
- Etwas funktioniert nicht: [Fehlerbehebung](./troubleshooting.md).
