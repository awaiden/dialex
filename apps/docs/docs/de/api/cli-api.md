# CLI-API

`@dialexjs/cli/api` ist die programmatische API, auf der die [VS-Code-Erweiterung](../guide/vscode.md) und der Language Server aufbauen. Sie liest Wörterbücher und Konfigurationen aus dem Syntaxbaum und **führt keinen Projektcode aus**, mit Ausnahme der zwei unten markierten optionalen Funktionen.

```ts
import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
```

## Analyse

### `analyzeProject(options)`

```ts
function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult>;
```

Findet die Wörterbücher eines Projekts, prüft Locale-Parität, ICU-Nachrichten, veraltete Einträge der Lock-Datei und Referenzen aus dem Quellcode und liefert die Probleme. `dialex check` ist eine dünne Schicht darüber.

| Option     | Typ                   | Standard              | Beschreibung                                                                                                                                          |
| ---------- | --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`     | `string`              | —                     | Der Projektordner. Erforderlich                                                                                                                       |
| `config`   | `AnalysisConfig`      | —                     | `defaultLocale`, `locales`, `include`, `exclude`. Erforderlich                                                                                        |
| `src`      | `string[]`            | `DEFAULT_SOURCE_GLOB` | Quell-Globs, die nach Referenzen durchsucht werden. `[]` überspringt die Suche                                                                        |
| `runtime`  | `boolean`             | `false`               | **Führt Projektcode aus.** Importiert Wörterbücher, die der Syntaxbaum nicht beschreiben kann (Spreads, berechnete Schlüssel). Editoren lassen es aus |
| `ignore`   | `string[]`            | —                     | Weitere Ignore-Globs relativ zu `root` (verschachtelte Projekte)                                                                                      |
| `unused`   | `boolean`             | `true`                | Möglicherweise ungenutzte Schlüssel und Wörterbücher melden                                                                                           |
| `lock`     | `boolean`             | `true`                | Übersetzungen melden, deren Ausgangstext sich seit `dialex.lock.json` geändert hat                                                                    |
| `cache`    | `AnalysisCache`       | —                     | Geparste Wörterbücher und durchsuchte Quellen zwischen Aufrufen wiederverwenden. Mit `runtime` ignoriert                                              |
| `contents` | `Map<string, string>` | —                     | Ungespeicherter Text von Dateien nach absolutem Pfad, der statt der Datei auf der Platte gelesen wird. Für Linter und Editoren                        |

Das Ergebnis:

| Feld                 | Typ                    | Beschreibung                                                                            |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `issues`             | `AnalysisIssue[]`      | Alles Gefundene. Siehe die Tabelle unten                                                |
| `dictionaries`       | `AnalyzedDictionary[]` | Ein Eintrag je lesbarem Wörterbuch                                                      |
| `files`              | `string[]`             | Absolute Pfade jeder passenden Wörterbuchdatei                                          |
| `sourceFilesScanned` | `number`               | Wie viele Quelldateien nach Referenzen durchsucht wurden                                |
| `inlineDictionaries` | `string[]`             | Im Code mit `dictionaries: { name: ... }` registrierte Namen. Leer, wenn `src` `[]` ist |

Eine `AnalysisIssue` hat `file`, `level` (`"error" \| "warning" \| "info"`), `code` ([siehe die Codes](../guide/diagnostics.md)), `message` und, wenn bekannt, `range` (nullbasiertes `{ start, end }` aus `{ line, column }`), `dictionary`, `locale`, `path` und `sourceLocale` (bei `missing-key`: eine Locale, aus der der Schlüssel kopiert werden kann).

Ein `AnalyzedDictionary` hat `name`, `file`, `locales`, `leaves` (`locale -> Punktpfad -> { kind, value? }`), `paths` (die Vereinigung der Punktpfade) und, wenn statisch gelesen, `df` zum Bearbeiten.

### Weitere Analyse-Exporte

| Export                        | Beschreibung                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAnalysisCache()`       | Ein `AnalysisCache` für langlebige Aufrufer. Er verwendet Unverändertes wieder (Schlüssel: Änderungszeit und Größe)                                                  |
| `analyzeProjectSync(options)` | `analyzeProject` für Aufrufer, die nicht warten können, etwa Lint-Regeln. Liest Wörterbücher nur aus dem Syntaxbaum: `runtime` wird ignoriert, Projektcode läuft nie |
| `clearGitignore(cache)`       | Vergisst die zwischengespeicherten `.gitignore`-Regeln, etwa nachdem sich eine `.gitignore` geändert hat                                                             |
| `scanReferences(text)`        | Findet Referenzen der Form `getDictionary("x")` und `t("x.y.z")` im Quelltext. Liefert `{ kind, value, start, end }[]`                                               |
| `scanText(text)`              | Wie `scanReferences`, liefert aber auch die Wörterbuchnamen, die der Text inline registriert. Liefert `{ references, inline }`                                       |
| `relativeFile(root, file)`    | Ein Pfad relativ zur Wurzel mit Schrägstrichen, zur Anzeige                                                                                                          |
| `DEFAULT_SOURCE_GLOB`         | `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`                                                                                                                  |

## Dateien durchsuchen

| Export                                | Beschreibung                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scanFiles(root, patterns, options?)` | Findet Dateien unter `root` und überspringt Build-Ausgabe, konfigurierte Excludes und von Git ignorierte Pfade. Optionen: `kind`, `exclude`, `ignore`, `gitignore`, `gitignoreFilter` |
| `createGitignoreFilter(root)`         | Eine Funktion, die sagt, ob ein absoluter Pfad von Git ignoriert wird; sie liest die `.gitignore`-Dateien des Projekts, seiner Eltern und verschachtelter Ordner                      |
| `BUILTIN_IGNORE`                      | Ordner, die nie Wörterbücher oder Quellen enthalten                                                                                                                                   |
| `SOURCE_BUILTIN_IGNORE`               | Was die Quellsuche zusätzlich überspringt: Ausgabe anderer Werkzeuge, Deklarationen, generierte und Konfigurationsdateien                                                             |

## Wörterbücher bearbeiten

Die Helfer arbeiten auf dem Syntaxbaum und erhalten den Rest der Datei, einschließlich Kommentaren und Formatierung.

| Export                                                     | Beschreibung                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDictionaryText(file, text)`                          | Parst den Quelltext eines Wörterbuchs (etwa einen ungespeicherten Puffer). `undefined`, wenn die Form nicht bearbeitbar ist; wirft bei Syntaxfehlern |
| `loadDictionaryFile(file)`                                 | Lädt eine Datei. `undefined`, wenn ihre Form nicht bearbeitbar ist                                                                                   |
| `renderDictionaryFile(df)`                                 | Der Quelltext mit allen Änderungen, ohne zu schreiben                                                                                                |
| `saveDictionaryFile(df)`                                   | Schreibt die bearbeitete Datei                                                                                                                       |
| `listLocales(df)`, `listLeaves(df, locale)`                | Die Locales und jedes Blatt `{ path, kind, value? }` einer Locale in Quellreihenfolge                                                                |
| `hasPath(df, locale, path)`, `getString(df, locale, path)` | Ob ein Schlüssel existiert und sein String-Wert                                                                                                      |
| `setString(df, locale, path, value)`                       | Setzt oder erzeugt einen String. Liefert `"created"`, `"updated"` oder `"skipped"` (Funktionen werden nie überschrieben)                             |
| `copyLeaf(df, from, to, path, mapString?)`                 | Kopiert ein Blatt zwischen Locales, optional mit umgeschriebenen Strings. `false`, wenn nichts zu kopieren ist oder das Ziel den Schlüssel hat       |
| `locationOf(df, locale, path?)`                            | Der Bereich des Eigenschaftsnamens einer Locale oder eines Schlüssels                                                                                |
| `dictionaryLocation(df)`                                   | Der Bereich des Objekts, dessen Schlüssel Locales sind                                                                                               |
| `getLeafSource(df, locale, path)`                          | Der Quellcode des Werts eines Blatts                                                                                                                 |
| `TODO_PREFIX`                                              | `"[TODO] "`: was `--fix` vor kopierte Strings setzt                                                                                                  |

## Konfiguration

| Export                           | Beschreibung                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readStaticConfig(root, file?)`  | Liest `dialex.config.*` aus dem Syntaxbaum: `{ config, file?, notes }`. `notes` nennt Einstellungen, die keine Literale sind und auf ihren Standardwerten blieben |
| `parseStaticConfig(text, file?)` | Dasselbe für Quelltext                                                                                                                                            |
| `DEFAULT_STATIC_CONFIG`          | Die Standardwerte, wenn eine Einstellung nicht gelesen werden kann                                                                                                |

## Projekte und Generierung

| Export                                                          | Beschreibung                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `loadStaticProject(root, configFile?)`                          | Die Konfiguration (aus dem Syntaxbaum) und jede Wörterbuchdatei, bereit zum Lesen und Bearbeiten. Führt keinen Projektcode aus |
| `loadProject(root, configFile?)`                                | **Führt Projektcode aus**: wertet `dialex.config.*` aus, bevor die Wörterbücher geladen werden                                 |
| `toKey(dictionary, path)`                                       | `("home", ["nav", "about"])` wird zu `"home.nav.about"`                                                                        |
| `renderGenerated(root, options?)`                               | Berechnet `dialex.generated.ts` und `dialex-env.d.ts` ohne zu schreiben, um zu sehen, ob sie aktuell sind                      |
| `generateDictionaries(root, options?)`                          | Schreibt die generierten Dateien. `options.static` liest die Konfiguration, ohne sie auszuführen                               |
| `startGenerateWatcher(root, options, regenerate, delay?, log?)` | Generiert neu, wenn eine Wörterbuch- oder Konfigurationsdatei hinzukommt, sich ändert oder entfernt wird                       |

## Lock-Datei

| Export                                    | Beschreibung                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `LOCK_FILE`                               | `"dialex.lock.json"`                                                                                                   |
| `readLock(root)`, `writeLock(root, lock)` | Liest die Lock-Datei (oder `undefined`) und schreibt sie mit sortierten Schlüsseln                                     |
| `hashSource(text)`                        | Der kurze Fingerabdruck, der für einen Ausgangsstring gespeichert wird                                                 |
| `isStale(lock, locale, key, text)`        | `true`, wenn der Schlüssel aus anderem Ausgangstext aufgezeichnet wurde. Ein Schlüssel ohne Eintrag ist nicht veraltet |

## Typen

`AnalysisCache`, `AnalysisConfig`, `AnalysisIssue`, `AnalysisOptions`, `AnalysisResult`, `AnalyzedDictionary`, `IssueCode`, `IssueLevel`, `LeafInfo`, `Reference`, `ScanOptions`, `Lockfile`, `DictionaryFile`, `Leaf`, `LeafKind`, `SourceRange`, `StaticConfig`, `StaticConfigResult`, `Project`, `ProjectDictionary`, `GenerateOptions`, `RenderedGenerate`.
