# Express

```ts
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

Die Middleware fügt `req.locale` und `req.getDictionary(name)` hinzu (auch an `res.locals`). Cookies werden aus `req.cookies` gelesen, wenn `cookie-parser` installiert ist, andernfalls aus dem Header `Cookie`. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Installation

Installiere das Framework-Paket, das du ohnehin nutzt, zusammen mit Dialex und kompiliere dann die Wörterbücher:

```bash
npm install dialexjs express
npm install -D @dialexjs/cli
npx dialex generate
```

## Optionen

Der Adapter nimmt die [Optionen zur Locale-Erkennung](../guide/locale-detection.md), `dictionaries` und `setHeader`. Jede Option, Adapter für Adapter, steht unter [Server-Adapter](../api/server-adapters.md).

## TypeScript

`dialex generate` schreibt `dialex-env.d.ts`. Ist sie in `tsconfig.json` eingebunden (und `moduleResolution` auf `"bundler"` oder `"nodenext"` gesetzt), vervollständigt `req.getDictionary("home")` die Wörterbuchnamen und typisiert den Inhalt, und `locale` ist die Union deiner konfigurierten Locales.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere den Adapter vor deinen Routen, damit jeder Handler das Locale und `getDictionary` sieht.
- Lass `setHeader` eingeschaltet, damit Antworten `Content-Language` tragen, und füge `Vary: Accept-Language` hinzu, wenn ein CDN oder Proxy Seiten zwischenspeichert, die von diesem Header abhängen.
- `cookie-parser` ist optional: Ohne es liest Dialex den Header `Cookie` selbst, du musst es also nicht nur für die Locale-Erkennung installieren.

## Fehlerbehebung

- **`req.getDictionary is not a function`**: Die Middleware ist nach der Route oder gar nicht registriert. `app.use(dialexExpress({ ...dialex }))` muss zuerst stehen.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
