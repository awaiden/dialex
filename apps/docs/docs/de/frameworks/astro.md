# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
```

Kombiniere sie mit anderer Middleware über `sequence` aus `astro:middleware`.

In Seiten und Komponenten liegen Locale und Wörterbuch-Zugriff auf `Astro.locals`, typisiert über eine Erweiterung von `App.Locals`:

```astro
---
const dict = Astro.locals.getDictionary("home");
---

<html lang={Astro.locals.locale}>
  <h1>{dict.title}</h1>
</html>
```

Die Middleware liest die Anfrage-URL, Header und Cookies, gilt also für On-Demand-Routen (SSR). Statisch vorgerenderte Seiten haben zur Build-Zeit keine Anfrage, die untersucht werden könnte. `Content-Language` wird gesetzt, sofern `setHeader` nicht `false` ist. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten, und `custom` erhält den Astro-Kontext.

## Installation

Installiere das Framework-Paket, das du ohnehin nutzt, zusammen mit Dialex und kompiliere dann die Wörterbücher:

```bash
npm install dialexjs astro
npm install -D @dialexjs/cli
npx dialex generate
```

## Optionen

Der Adapter nimmt die [Optionen zur Locale-Erkennung](../guide/locale-detection.md), `dictionaries` und `setHeader`. Jede Option, Adapter für Adapter, steht unter [Server-Adapter](../api/server-adapters.md).

## TypeScript

`dialex generate` schreibt `dialex-env.d.ts`. Ist sie in `tsconfig.json` eingebunden (und `moduleResolution` auf `"bundler"` oder `"nodenext"` gesetzt), vervollständigt `Astro.locals.getDictionary("home")` die Wörterbuchnamen und typisiert den Inhalt, und `locale` ist die Union deiner konfigurierten Locales.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Lege die Middleware in `src/middleware.ts` und lies das Locale in Seiten, Layouts und Endpunkten aus `Astro.locals`; ermittle es nicht erneut pro Seite.
- Setze `<html lang={Astro.locals.locale}>` in deinem Layout und füge mit den [Routing-Helfern](../guide/routing.md) `hreflang`-Links für Seiten hinzu, die in mehreren Sprachen existieren.

## Fehlerbehebung

- **`Astro.locals.getDictionary` is not a function**: Astro lädt nur `src/middleware.ts` (oder `src/middleware/index.ts`). Exportiere `onRequest` von dort.
- **Statische Seiten sind immer in einer Sprache**: Beim Prerendering gibt es keine Anfrage. Rendere Routen pro Sprache (`/en/...`, `/tr/...`) oder nutze Server-Ausgabe.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
