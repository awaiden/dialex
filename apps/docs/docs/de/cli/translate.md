# dialex translate

Füllt fehlende Übersetzungen mit einem Machine-Translation-Provider, den du konfigurierst. Es wird nirgendwohin etwas gesendet, solange kein Provider gesetzt ist.

```bash
dialex translate --dry-run
dialex translate
dialex translate -l tr de
dialex translate -s en
dialex translate --stale
```

| Option                      | Beschreibung                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `-l, --locale <locales...>` | Ziel-Locales (Standard: alle konfigurierten Locales außer dem Quell-Locale)             |
| `-s, --source <locale>`     | Quell-Locale (Standard: `translate.sourceLocale`, dann `defaultLocale`)                 |
| `--dry-run`                 | Listet auf, was übersetzt würde. Ruft den Provider nicht auf und schreibt keine Dateien |
| `--stale`                   | Übersetzt Strings erneut, deren Quelltext sich geändert hat (siehe unten)               |
| `-c, --config <path>`       | Eigener Konfigurationspfad                                                              |

## Einen Provider konfigurieren

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";
import { claudeProvider } from "@dialexjs/cli/translate";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  translate: {
    provider: claudeProvider({ context: "Banking app. Use a formal register." }),
  },
});
```

### Eingebaute Provider

| Provider                   | Zugangsdaten                                                                               | Optionen                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `claudeProvider(options?)` | `ANTHROPIC_API_KEY` (oder `apiKey`)                                                        | `model`, `batchSize` (Standard 40), `context`, `baseUrl`                |
| `deeplProvider(options?)`  | `DEEPL_API_KEY` (oder `apiKey`). Schlüssel, die auf `:fx` enden, nutzen die kostenlose API | `formality`, `baseUrl`                                                  |
| `openaiProvider(options?)` | `OPENAI_API_KEY` (oder `apiKey`; bei eigenem `baseUrl` optional)                           | `model`, `batchSize` (Standard 40), `context`, `baseUrl`, `temperature` |
| `geminiProvider(options?)` | `GEMINI_API_KEY` oder `GOOGLE_API_KEY` (oder `apiKey`)                                     | `model`, `batchSize` (Standard 40), `context`, `baseUrl`, `temperature` |

`openaiProvider` ruft die OpenAI-Chat-Completions-API auf. Setze `baseUrl`, um einen OpenAI-kompatiblen Server wie Azure OpenAI, Ollama oder OpenRouter zu nutzen; der Schlüssel ist dann optional. Jeder Provider bringt ein Standardmodell mit (`claude-sonnet-5-5`, `gpt-4o-mini`, `gemini-2.5-flash`). Ändere es mit `model` oder über die Umgebungsvariablen `OPENAI_MODEL` / `GEMINI_MODEL`.

Die Provider für Claude, OpenAI und Gemini sind nur gegen gemocktes HTTP getestet, nicht gegen die echten Dienste. Prüfe die Modellnamen daher anhand der aktuellen Liste des jeweiligen Anbieters.

### Dein eigener Provider

Ein Provider ist ein beliebiges Objekt mit einer Funktion `translate`, die pro Eingabe eine Übersetzung in derselben Reihenfolge zurückgibt:

```ts
translate: {
  provider: {
    name: "my-service",
    async translate(texts, from, to) {
      return await myService.translateAll(texts, from, to);
    },
  },
  sourceLocale: "en",
}
```

## Was übersetzt wird

Ein String wird übersetzt, wenn das Ziel-Locale keinen Wert dafür hat oder sein Wert noch mit `[TODO]` beginnt (siehe [`check --fix`](./check.md#fix)). Vorhandene Übersetzungen werden nie überschrieben. Funktionswerte werden nicht übersetzt. Identische Quell-Strings werden pro Locale nur einmal gesendet.

<a id="keeping-translations-in-sync"></a>

## Übersetzungen aktuell halten

`dialex translate` füllt nur fehlende Strings. Um zu bemerken, wenn sich der _Quelltext_ danach ändert, führt Dialex neben deiner Konfiguration eine Sperrdatei, `dialex.lock.json`. Sie speichert einen kurzen Hash des Quelltexts, aus dem jede Übersetzung entstand.

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

- `dialex translate` und [`dialex import`](./import.md) tragen ein, was sie schreiben.
- `dialex lock` trägt die vorhandenen Übersetzungen ein (einmal ausführen, um die Sperrdatei zu übernehmen). Bereits veraltete Übersetzungen bleiben unberührt; `dialex lock --all` akzeptiert sie.
- [`dialex check`](./check.md) warnt bei jeder Übersetzung, deren Quelltext sich seit dem Eintrag geändert hat, und `--fail-on-stale` macht daraus einen Fehler. Übersetzungen ohne Eintrag, etwa handgeschriebene, werden nie gemeldet.
- `dialex translate --stale` übersetzt die veralteten Strings erneut. Nur diese dürfen eine vorhandene Übersetzung ersetzen.

Committe `dialex.lock.json`, damit das ganze Team denselben Stand sieht.

## ICU-Nachrichten

Strings, die die ICU-Syntax für Plural oder Select verwenden ([ICU](../guide/icu.md)), werden nur an Provider gesendet, die `supportsIcu: true` angeben (`claudeProvider`, `openaiProvider` und `geminiProvider` tun das; `deeplProvider` nicht). Für andere Provider werden sie übersprungen und in der Zusammenfassung aufgelistet. Eigene Provider melden sich mit `supportsIcu: true` an.

Eine übersetzte ICU-Nachricht wird nur akzeptiert, wenn sie dieselben Argumente und Typen, jeden `select`-Schlüssel und jeden exakten `=N`-Treffer beibehält. Plural-Kategorien dürfen hinzukommen oder entfallen, weil Sprachen unterschiedliche brauchen.

## Sicherheitsprüfungen

Platzhalter wie `{name}`, `%s`, `%1$d` und HTML-Tags müssen die Übersetzung überstehen. Ein Ergebnis, das einen davon weglässt oder ändert, wird abgelehnt, bleibt unverändert und wird in der Zusammenfassung aufgelistet, ebenso wie ein leeres Ergebnis.

Prüfe die Änderungen anschließend in der Versionsverwaltung. Maschinelle Übersetzung ist ein Ausgangspunkt, keine endgültige Antwort.
