# Express

```ts
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

El middleware añade `req.locale` y `req.getDictionary(name)` (también en `res.locals`). Las cookies se leen de `req.cookies` cuando `cookie-parser` está instalado y, si no, de la cabecera `Cookie`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Registra el adaptador antes de tus rutas, para que cada manejador vea el locale y `getDictionary`.
- Mantén `setHeader` activado para que las respuestas lleven `Content-Language`, y añade `Vary: Accept-Language` si un CDN o proxy cachea páginas que dependen de esa cabecera.
- `cookie-parser` es opcional: sin él, Dialex lee la cabecera `Cookie` por sí mismo, así que no tienes que instalarlo solo para detectar el locale.

## Solución de problemas

- **`req.getDictionary is not a function`**: el middleware está registrado después de la ruta o no está registrado. `app.use(dialexExpress({ ...dialex }))` debe ir primero.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
