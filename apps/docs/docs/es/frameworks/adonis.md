# AdonisJS

`dialexjs/adonis` construye una clase de middleware para AdonisJS 6 y posteriores. Créala en un archivo de middleware:

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });
```

La importación de arriba lee el archivo generado desde `start/`. Establece `output` en `dialex.config.ts` para colocarlo allí (`dialex init` lo hace para AdonisJS):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "start/dialex.generated.ts",
});
```

Regístrala como middleware del router, para que se ejecute en cada ruta:

```ts
// start/kernel.ts
import router from "@adonisjs/core/services/router";

router.use([() => import("#middleware/dialex_middleware")]);
```

Los handlers leen entonces `ctx.locale` y `ctx.getDictionary(name)`:

```ts
// start/routes.ts
import router from "@adonisjs/core/services/router";

router.get("/:locale", ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { title: dict.title, locale };
});
```

El middleware también establece la cabecera de respuesta `Content-Language`. Todas las [opciones de detección de locale](../guide/locale-detection.md#options) se aplican.

## Instalación

Instala el paquete del framework que ya usas junto con Dialex y luego compila los diccionarios:

```bash
npm install dialexjs @adonisjs/core
npm install -D @dialexjs/cli
npx dialex generate
```

## Opciones

El adaptador acepta las [opciones de detección de locale](../guide/locale-detection.md), `dictionaries` y `setHeader`. Cada opción, adaptador por adaptador, está en [Adaptadores de servidor](../api/server-adapters.md).

## TypeScript

`dialex generate` escribe `dialex-env.d.ts`. Con ese archivo incluido en `tsconfig.json` (y `moduleResolution` en `"bundler"` o `"nodenext"`), `ctx.getDictionary("home")` autocompleta los nombres de diccionario, tipa el contenido, y `locale` es la unión de tus locales configurados.

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` a `createDialexMiddleware`. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Regístralo con `router.use`, no en una sola ruta, para que cada ruta vea el locale y la cabecera `Content-Language`.
- Desestructura `locale` y `getDictionary` del contexto en los handlers; ambos están establecidos durante toda la petición.

## Solución de problemas

- **`ctx.getDictionary is not a function`**: el middleware no está registrado, o la ruta a la que pertenece no está cubierta por él. Añádelo con `router.use` en `start/kernel.ts`.
- **Error de tipos en `ctx.locale`**: las declaraciones de `dialexjs/adonis` no forman parte de tu proyecto. Ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
