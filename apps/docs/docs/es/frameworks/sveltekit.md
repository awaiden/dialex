# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });
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

## Buenas prácticas

- Resuelve el locale en el servidor con `dialexHandle` y pásalo al navegador desde el `+layout.server.ts` raíz. En los componentes, usa [`dialexjs/svelte`](./svelte.md) con `initialLocale`, para que el primer render del cliente coincida con el HTML.
- Combina `dialexHandle` con tus otros hooks usando `sequence` de `@sveltejs/kit/hooks`, y ponlo primero para que los hooks posteriores puedan leer `event.locals.locale`.
- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.

## Solución de problemas

- **`locals.getDictionary` is not a function**: `handle` no se exporta desde `src/hooks.server.ts`, o `dialexHandle` no forma parte de él. Exporta `handle = dialexHandle({ ...dialex })`.
- **`getDictionary` devuelve `any`**: falta el registro de tipos. Ejecuta `dx generate` y asegúrate de que `dialex-env.d.ts` esté incluido en tu `tsconfig`.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
