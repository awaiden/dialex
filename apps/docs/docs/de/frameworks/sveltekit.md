# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { i18nHandle } from "dialexjs/sveltekit";
import dictionaries from "./i18n.generated.js";

export const handle = i18nHandle({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

Kombiniere ihn mit anderen Hooks über `sequence` aus `@sveltejs/kit/hooks`.

## Locals

`i18nHandle` füllt `event.locals.locale` und `event.locals.getDictionary(name)` und erweitert `App.Locals`, sodass beide typisiert sind:

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
