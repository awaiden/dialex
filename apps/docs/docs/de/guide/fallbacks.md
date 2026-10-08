# Locale-Fallbacks

Hat ein Wörterbuch keinen Inhalt für das angeforderte Locale, durchläuft Dialex eine Fallback-Kette, statt direkt zum Standard zu springen:

1. das Locale selbst (`pt-BR`)
2. seine expliziten Fallbacks aus der Konfiguration, in der angegebenen Reihenfolge
3. seine Kürzungen der Subtags (`pt-BR` → `pt`)
4. die Kürzungen der expliziten Fallbacks
5. `defaultLocale`

Passt nichts, wird das erste im Wörterbuch definierte Locale verwendet.

```ts
// dialex.config.ts
import { defineConfig } from "dialex";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "es", "pt"],
  fallbacks: {
    "pt-BR": ["pt", "es"],
    gl: ["es"],
  },
});
```

Beispielsweise wird eine Anfrage für `tr-TR` bei einem türkischen Wörterbuch ohne jede Konfiguration zu `tr` aufgelöst. Eine Anfrage für `gl` ohne galicischen Inhalt wird zu `es` aufgelöst.

Immer wenn der Inhalt aus einem anderen als dem angeforderten Locale stammt, wird eine Warnung protokolliert.

## Adapter

Server-Adapter akzeptieren `fallbacks` auch direkt. Das ist praktisch, wenn du `dictionaries` übergibst, statt dich auf die Konfigurationsdatei zu verlassen:

```ts
app.use(i18n({ dictionaries, locales: ["en", "es"], fallbacks: { pt: ["es"] } }));
```

Fallbacks gelten für Wörterbuchzugriffe. Die [Locale-Erkennung](./locale-detection.md) liefert weiterhin nur Locales, die in `locales` aufgeführt sind.
