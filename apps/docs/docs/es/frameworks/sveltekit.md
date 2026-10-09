# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import dictionaries from "./dialex.generated.js";

export const handle = dialexHandle({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

Combínalo con otros hooks usando `sequence` de `@sveltejs/kit/hooks`.

## Locals

`dialexHandle` rellena `event.locals.locale` y `event.locals.getDictionary(name)`, y amplía `App.Locals` para que ambos tengan tipos:

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## Idioma del documento

Coloca el marcador en `src/app.html`; se sustituye por el locale resuelto en cada respuesta:

```html
<html lang="%dialex.lang%"></html>
```

`Content-Language` se establece a menos que `setHeader` sea `false`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options), y `custom` recibe el evento de la petición.
