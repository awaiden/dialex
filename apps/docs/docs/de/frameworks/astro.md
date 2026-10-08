# Astro

```ts
// src/middleware.ts
import { i18n } from "dialexjs/astro";
import dictionaries from "./i18n.generated.js";

export const onRequest = i18n({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
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
