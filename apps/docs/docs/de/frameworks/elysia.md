# Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";
import { Elysia } from "elysia";

import { dialex } from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

Das Plugin wird global registriert und leitet im Request-Kontext zwei Werte ab: `locale` und `getDictionary(name)`. Es setzt `Content-Language` in der Antwort, sofern `setHeader` nicht `false` ist. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten, und `custom` erhält den Elysia-Kontext.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Füge das Plugin mit `.use()` vor den Routen hinzu, die `locale` lesen; Elysia wendet Plugins in der Reihenfolge an, in der sie hinzugefügt werden.
- Lass `setHeader` eingeschaltet, damit Antworten `Content-Language` tragen, und füge `Vary: Accept-Language` hinzu, wenn ein CDN oder Proxy Seiten zwischenspeichert, die von diesem Header abhängen.

## Fehlerbehebung

- **`locale` ist in einem Handler undefiniert**: Das Plugin wurde nach der Route hinzugefügt. Füge `.use(dialexElysia({ ...dialex }))` zuerst in die Kette ein.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
