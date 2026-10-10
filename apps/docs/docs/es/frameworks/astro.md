# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
```

Combínalo con otro middleware usando `sequence` de `astro:middleware`.

En las páginas y los componentes, el locale y el acceso al diccionario están en `Astro.locals`, con tipos mediante una ampliación de `App.Locals`:

```astro
---
const dict = Astro.locals.getDictionary("home");
---

<html lang={Astro.locals.locale}>
  <h1>{dict.title}</h1>
</html>
```

El middleware lee la URL de la petición, las cabeceras y las cookies, por lo que se aplica a las rutas bajo demanda (SSR). Las páginas prerenderizadas de forma estática no tienen ninguna petición que inspeccionar en tiempo de compilación. `Content-Language` se establece a menos que `setHeader` sea `false`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options), y `custom` recibe el contexto de Astro.

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Mantén el middleware en `src/middleware.ts` y lee el locale de `Astro.locals` en páginas, layouts y endpoints; no lo resuelvas de nuevo por página.
- Establece `<html lang={Astro.locals.locale}>` en tu layout y añade enlaces `hreflang` con los [ayudantes de enrutamiento](../guide/routing.md) para páginas que existen en varios idiomas.

## Solución de problemas

- **`Astro.locals.getDictionary` is not a function**: Astro solo carga `src/middleware.ts` (o `src/middleware/index.ts`). Exporta `onRequest` desde ahí.
- **Las páginas estáticas siempre están en un idioma**: con prerenderizado no hay petición. Renderiza rutas por idioma (`/en/...`, `/tr/...`) o usa salida de servidor.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
