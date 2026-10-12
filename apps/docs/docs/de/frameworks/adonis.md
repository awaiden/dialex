# AdonisJS

`dialexjs/adonis` erzeugt eine Middleware-Klasse für AdonisJS 6 und neuer. Lege sie in einer Middleware-Datei an:

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });
```

Der Import oben liest die generierte Datei aus `start/`. Setze `output` in `dialex.config.ts`, damit sie dort landet (`dialex init` macht das für AdonisJS):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "start/dialex.generated.ts",
});
```

Registriere sie als Router-Middleware, damit sie für jede Route läuft:

```ts
// start/kernel.ts
import router from "@adonisjs/core/services/router";

router.use([() => import("#middleware/dialex_middleware")]);
```

Handler lesen dann `ctx.locale` und `ctx.getDictionary(name)`:

```ts
// start/routes.ts
import router from "@adonisjs/core/services/router";

router.get("/:locale", ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { title: dict.title, locale };
});
```

Die Middleware setzt außerdem den Antwort-Header `Content-Language`. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Installation

Installiere das Framework-Paket, das du ohnehin nutzt, zusammen mit Dialex und kompiliere dann die Wörterbücher:

```bash
npm install dialexjs @adonisjs/core
npm install -D @dialexjs/cli
npx dialex generate
```

## Optionen

Der Adapter nimmt die [Optionen zur Locale-Erkennung](../guide/locale-detection.md), `dictionaries` und `setHeader`. Jede Option, Adapter für Adapter, steht unter [Server-Adapter](../api/server-adapters.md).

## TypeScript

`dialex generate` schreibt `dialex-env.d.ts`. Ist sie in `tsconfig.json` eingebunden (und `moduleResolution` auf `"bundler"` oder `"nodenext"` gesetzt), vervollständigt `ctx.getDictionary("home")` die Wörterbuchnamen und typisiert den Inhalt, und `locale` ist die Union deiner konfigurierten Locales.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an `createDialexMiddleware`. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere sie mit `router.use` und nicht an einer einzelnen Route, damit jede Route das Locale und den Header `Content-Language` sieht.
- Zerlege in Handlern `locale` und `getDictionary` aus dem Kontext; beide sind für die gesamte Anfrage gesetzt.

## Fehlerbehebung

- **`ctx.getDictionary is not a function`**: Die Middleware ist nicht registriert, oder die Route wird von ihr nicht erfasst. Füge sie mit `router.use` in `start/kernel.ts` hinzu.
- **Typfehler bei `ctx.locale`**: Die Deklarationen von `dialexjs/adonis` sind nicht Teil deines Projekts. Führe `dx generate` aus und binde `dialex-env.d.ts` in deine `tsconfig` ein.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
