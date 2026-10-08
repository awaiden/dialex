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

| Option          | Typ                           | Standard            | Beschreibung                                                                                                           |
| --------------- | ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Locale, das verwendet wird, wenn keines ermittelt werden kann                                                          |
| `locales`       | `string[]`                    | —                   | Unterstützte Locales; aktiviert die Einengung des Locale-Typs und die Vollständigkeitsprüfungen                        |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) für Wörterbuchdateien                                                                                          |
| `configFile`    | `string`                      | —                   | Eigener Pfad zur Konfiguration                                                                                         |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Explizite [Fallback-Ketten](./fallbacks.md) pro Locale                                                                 |
| `prefixDefault` | `boolean`                     | `true`              | Ob auch das Standard-Locale ein URL-Präfix erhält. Wird von `I18nLink` und den [Routing-Helfern](./routing.md) gelesen |
| `lazy`          | `boolean`                     | `false`             | Wörterbücher bei Bedarf laden (nur Vite). Siehe [Lazy Loading](./lazy-loading.md)                                      |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Provider für [`dialex translate`](../cli/translate.md)                                                                 |

Inline an `i18nPlugin()` oder `withI18n()` übergebene Optionen überschreiben die Datei.
