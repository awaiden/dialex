# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });
```

Kombiniere ihn mit anderen Hooks über `sequence` aus `@sveltejs/kit/hooks`.

## Locals

`dialexHandle` füllt `event.locals.locale` und `event.locals.getDictionary(name)` und erweitert `App.Locals`, sodass beide typisiert sind:

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## Dokumentsprache

Setze den Platzhalter in `src/app.html` ein; er wird bei jeder Antwort durch das ermittelte Locale ersetzt:

```html
<html lang="%dialex.lang%"></html>
```

`Content-Language` wird gesetzt, sofern `setHeader` nicht `false` ist. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten, und `custom` erhält das Request-Event.

## Bewährte Vorgehensweisen

- Ermittle das Locale auf dem Server mit `dialexHandle` und gib es aus dem Wurzel-`+layout.server.ts` an den Browser weiter. Verwende in Komponenten [`dialexjs/svelte`](./svelte.md) mit `initialLocale`, damit das erste Client-Rendering zum HTML passt.
- Kombiniere `dialexHandle` mit deinen anderen Hooks über `sequence` aus `@sveltejs/kit/hooks` und stelle es an den Anfang, damit spätere Hooks `event.locals.locale` lesen können.
- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.

## Fehlerbehebung

- **`locals.getDictionary` is not a function**: `handle` wird nicht aus `src/hooks.server.ts` exportiert, oder `dialexHandle` ist nicht Teil davon. Exportiere `handle = dialexHandle({ ...dialex })`.
- **`getDictionary` liefert `any`**: Die Typregistry fehlt. Führe `dx generate` aus und stelle sicher, dass `dialex-env.d.ts` in deiner `tsconfig` enthalten ist.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
