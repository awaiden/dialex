# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

Die Middleware setzt `locale` und `getDictionary` als Kontextvariablen, die über `c.var` gelesen werden. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere den Adapter vor deinen Routen, damit jeder Handler das Locale und `getDictionary` sieht.
- Der Adapter liest nur die Anfrage und die übergebenen Wörterbücher, daher läuft er auf jeder von Hono unterstützten Laufzeit (Node, Bun, Deno, Workers).

## Fehlerbehebung

- **`c.var.getDictionary` ist undefiniert**: Die Middleware deckt die Route nicht ab. Registriere sie mit `app.use("*", dialexHono({ ...dialex }))` vor den Routen.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
