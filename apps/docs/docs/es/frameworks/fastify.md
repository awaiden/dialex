# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` está envuelto con `fastify-plugin` (nombre `dialex-fastify`, Fastify `>=4`), de modo que los decoradores de la petición son visibles entre contextos de encapsulación. También es la exportación por defecto. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Registra el plugin una vez en la instancia raíz, antes de tus rutas y otros plugins, para que `req.locale` y `req.getDictionary` existan en todas partes.
- Lee el locale que resolvió el adaptador en lugar de analizar `Accept-Language` o las cookies tú mismo, para que cada ruta coincida con el middleware.

## Solución de problemas

- **`req.getDictionary` es undefined en una ruta**: la ruta se registró antes que el plugin. `await app.register(dialexPlugin, { ...dialex })` debe terminar primero.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
