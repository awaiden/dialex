# Koa

```ts
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

Registriere `dialexKoa()` vor deinen Routen. Es fügt `ctx.locale` und `ctx.getDictionary(name)` hinzu. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere den Adapter vor deinen Routen, damit jeder Handler das Locale und `getDictionary` sieht.
- Verwende `ctx.locale`, um die Sprache jedes gesendeten Textes zu wählen, auch bei Fehlerantworten, damit sie zum Rest der Seite passen.

## Fehlerbehebung

- **`ctx.getDictionary is not a function`**: `dialexKoa()` ist nach dem Router registriert. Füge es mit `app.use` vor `router.routes()` hinzu.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
