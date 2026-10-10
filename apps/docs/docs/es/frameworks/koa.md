# Koa

```ts
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

Registra `dialexKoa()` antes de tus rutas. Añade `ctx.locale` y `ctx.getDictionary(name)`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Registra el adaptador antes de tus rutas, para que cada manejador vea el locale y `getDictionary`.
- Usa `ctx.locale` para elegir el idioma de cualquier texto que envíes, incluidas las respuestas de error, para que coincidan con el resto de la página.

## Solución de problemas

- **`ctx.getDictionary is not a function`**: `dialexKoa()` está registrado después del router. Añádelo con `app.use` antes de `router.routes()`.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
