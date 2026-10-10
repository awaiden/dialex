# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

El middleware establece `locale` y `getDictionary` como variables de contexto, que se leen mediante `c.var`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Registra el adaptador antes de tus rutas, para que cada manejador vea el locale y `getDictionary`.
- El adaptador solo lee la petición y los diccionarios que pasas, así que funciona en cualquier runtime que Hono soporte (Node, Bun, Deno, Workers).

## Solución de problemas

- **`c.var.getDictionary` es undefined**: el middleware no cubre la ruta. Regístralo con `app.use("*", dialexHono({ ...dialex }))` antes de las rutas.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
