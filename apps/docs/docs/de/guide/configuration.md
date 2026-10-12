# Konfiguration

Dialex lädt `dialex.config.*` (oder `i18n.config.*`) aus dem Projektstamm; unterstützt werden `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` und `.json`.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Option          | Typ                           | Standard            | Beschreibung                                                                                                                                                               |
| --------------- | ----------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Locale, das verwendet wird, wenn keines ermittelt werden kann                                                                                                              |
| `locales`       | `string[]`                    | —                   | Unterstützte Locales; ermöglicht Typeinschränkung für Locales und Paritätsprüfungen. Wenn weggelassen, nutzt `dx generate` die Locales, die deine Wörterbücher definieren  |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) für Wörterbuchdateien                                                                                                                                              |
| `exclude`       | `string[]`                    | —                   | Globs relativ zum Projekt, die nie nach Wörterbüchern oder Quellen durchsucht werden                                                                                       |
| `output`        | `string`                      | —                   | Wohin `dialex generate` `dialex.generated.ts` schreibt, relativ zum Projekt; die Typdeklarationen liegen daneben. Standard ist `src/`, ohne diesen Ordner der Projektstamm |
| `configFile`    | `string`                      | —                   | Eigener Pfad zur Konfiguration                                                                                                                                             |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Explizite [Fallback-Ketten](./fallbacks.md) pro Locale                                                                                                                     |
| `prefixDefault` | `boolean`                     | `true`              | Ob auch das Standard-Locale ein URL-Präfix erhält. Wird von `DialexLink` und den [Routing-Helfern](./routing.md) gelesen                                                   |
| `lazy`          | `boolean \| "locale"`         | `false`             | Wörterbücher bei Bedarf laden (Client-Bundles): `true` teilt pro Wörterbuch, `"locale"` pro Wörterbuch und Locale. Siehe [Lazy Loading](./lazy-loading.md)                 |
| `lint`          | `{ rules }`                   | —                   | Prüfungen abschalten oder Stufe und Optionen ändern, für `dialex check`, die Editoren und die [ESLint- und oxlint-Regeln](./linting.md)                                    |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Provider für [`dialex translate`](../cli/translate.md)                                                                                                                     |

Dialex überspringt `node_modules`, Build-Ausgaben und alles, was deine `.gitignore`-Dateien ausschließen (bei einem Paket in einem Monorepo auch die des Repositorys). Nutze `exclude` für alles andere, etwa einen mitversionierten Vendor-Ordner.

Die Datei ist optional: ohne sie gelten alle Standardwerte oben. `dx generate` kopiert die Einstellungen, die die Laufzeit braucht (nicht `translate`), nach `dialex.generated.ts`; führe es nach Änderungen an der Datei also erneut aus.

## Wo die Datei gefunden wird

Die Werkzeuge suchen im Projektstamm (dem Ordner, aus dem du `dialex` ausführst, bzw. dem Ordner des Projekts im Editor) nach `dialex.config.<ext>` und dann `i18n.config.<ext>`, wobei `<ext>` eines von `ts`, `mts`, `cts`, `js`, `mjs`, `cjs` oder `json` ist. Die erste gefundene gewinnt. `-c, --config <path>` (oder die Editor-Einstellung `dialex.configPath`) verweist auf eine andere Datei. In einem Monorepo ist jedes Paket mit einer Konfiguration ein eigenes Projekt, und ein Paket nur mit Wörterbüchern nutzt die Standardwerte.

## Wie die Werkzeuge sie lesen

| Werkzeug                                                    | Liest die Konfiguration durch                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dialex generate`, `check`, `export`, `import`, `translate` | Ausführen der Datei, sodass Werte berechnet sein dürfen (`locales: getLocales()`)                                       |
| Das native `dx`                                             | Lesen von `.dialex/config.json`, das `@dialexjs/config` schreibt, und bei einer Änderung der Konfiguration neu schreibt |
| Die Editor-Erweiterung und der Language Server              | Lesen ihres Syntaxbaums, ohne sie je auszuführen                                                                        |

Eine Konfiguration aus Literalen (Strings, Arrays, Booleans) wird überall verstanden. Eine berechnete Einstellung ist für den Editor unsichtbar, der dann dafür den Standardwert nutzt und einen Hinweis protokolliert. Muss ein Editor `locales` kennen, schreibe sie aus. Siehe [Native Binärdateien](./native.md).

`.dialex/config.json` wird wie `dialex.generated.ts` erzeugt: Tragen Sie `.dialex/` in Ihre `.gitignore` ein. Eine Konfiguration nur aus Literalen wird aus dem Syntaxbaum gelesen und nicht ausgeführt. Eine mit Spreads, Importen oder berechneten Werten führt `@dialexjs/config` einmal aus; es merkt sich die importierten Dateien und die gelesenen Umgebungsvariablen, und die nativen Werkzeuge prüfen diese Aufzeichnung bei jedem Lauf. Node wird nur für diesen Schritt gebraucht.

## Beispiele

Ein Projekt mit regionalen Fallbacks, dessen Standard-Locale ohne Präfix ausgeliefert wird:

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "pt", "pt-BR", "es"],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
});
```

Ein Framework, dessen Quellordner nicht `src/` ist, mit ausgeschlossenem Vendor-Ordner:

```ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
  exclude: ["vendor/**"],
});
```
