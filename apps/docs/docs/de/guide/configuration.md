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
| `translate`     | `{ provider, sourceLocale? }` | —                   | Provider für [`dialex translate`](../cli/translate.md)                                                                                                                     |

Dialex überspringt `node_modules`, Build-Ausgaben und alles, was deine `.gitignore`-Dateien ausschließen (bei einem Paket in einem Monorepo auch die des Repositorys). Nutze `exclude` für alles andere, etwa einen mitversionierten Vendor-Ordner.

Die Datei ist optional: ohne sie gelten alle Standardwerte oben. `dx generate` kopiert die Einstellungen, die die Laufzeit braucht (nicht `translate`), nach `dialex.generated.ts`; führe es nach Änderungen an der Datei also erneut aus.
