# Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";
import { Elysia } from "elysia";

import { dialex } from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

El plugin se registra de forma global y deriva dos valores en el contexto de la petición: `locale` y `getDictionary(name)`. Establece `Content-Language` en la respuesta a menos que `setHeader` sea `false`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options), y `custom` recibe el contexto de Elysia.

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Añade el plugin con `.use()` antes de las rutas que leen `locale`; Elysia aplica los plugins en el orden en que se añaden.
- Mantén `setHeader` activado para que las respuestas lleven `Content-Language`, y añade `Vary: Accept-Language` si un CDN o proxy cachea páginas que dependen de esa cabecera.

## Solución de problemas

- **`locale` es undefined en un manejador**: el plugin se añadió después de la ruta. Encadena primero `.use(dialexElysia({ ...dialex }))`.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
