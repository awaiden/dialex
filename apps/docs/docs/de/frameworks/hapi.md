# Hapi

```ts
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });

await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/{locale}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return { title: dict.title, locale: request.locale };
  },
});

await server.start();
```

Registriere `dialexPlugin` vor deinen Routen. Es fügt jeder Anfrage `request.locale` und `request.getDictionary(name)` hinzu und setzt den Antwort-Header `Content-Language`, auch bei Fehlerantworten. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Installation

Installiere das Framework-Paket, das du ohnehin nutzt, zusammen mit Dialex und kompiliere dann die Wörterbücher:

```bash
npm install dialexjs @hapi/hapi
npm install -D @dialexjs/cli
npx dialex generate
```

## Optionen

Der Adapter nimmt die [Optionen zur Locale-Erkennung](../guide/locale-detection.md), `dictionaries` und `setHeader`. Jede Option, Adapter für Adapter, steht unter [Server-Adapter](../api/server-adapters.md).

## TypeScript

`dialex generate` schreibt `dialex-env.d.ts`. Ist sie in `tsconfig.json` eingebunden (und `moduleResolution` auf `"bundler"` oder `"nodenext"` gesetzt), vervollständigt `request.getDictionary("home")` die Wörterbuchnamen und typisiert den Inhalt, und `locale` ist die Union deiner konfigurierten Locales.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` als Plugin-Optionen. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere das Plugin vor den Routen, die das Locale lesen. Das Locale wird im Erweiterungspunkt `onRequest` ermittelt und steht daher in jedem späteren Schritt des Lebenszyklus zur Verfügung, auch bei Authentifizierung und Validierung.
- Verwende `request.locale`, um die Sprache jedes gesendeten Textes zu wählen, auch bei `Boom`-Fehlermeldungen, damit sie zum Rest der Seite passen.

## Fehlerbehebung

- **`request.getDictionary is not a function`**: Das Plugin ist nicht auf dem Server registriert, dem die Route gehört. Registriere es auf dem Root-Server oder auf dem Plugin, das die Route definiert.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
