# Hapi

```ts
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });

await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/{locale}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return { title: dict.title, locale: request.locale };
  },
});

await server.start();
```

Registra `dialexPlugin` antes de tus rutas. Añade `request.locale` y `request.getDictionary(name)` a cada petición y establece la cabecera de respuesta `Content-Language`, también en las respuestas de error. Todas las [opciones de detección de locale](../guide/locale-detection.md#options) se aplican.

## Instalación

Instala el paquete del framework que ya usas junto con Dialex y luego compila los diccionarios:

```bash
npm install dialexjs @hapi/hapi
npm install -D @dialexjs/cli
npx dialex generate
```

## Opciones

El adaptador acepta las [opciones de detección de locale](../guide/locale-detection.md), `dictionaries` y `setHeader`. Cada opción, adaptador por adaptador, está en [Adaptadores de servidor](../api/server-adapters.md).

## TypeScript

`dialex generate` escribe `dialex-env.d.ts`. Con ese archivo incluido en `tsconfig.json` (y `moduleResolution` en `"bundler"` o `"nodenext"`), `request.getDictionary("home")` autocompleta los nombres de diccionario, tipa el contenido, y `locale` es la unión de tus locales configurados.

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` como opciones del plugin. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Registra el plugin antes de las rutas que leen el locale. El locale se resuelve en el punto de extensión `onRequest`, por lo que está disponible en cada paso posterior del ciclo de vida, incluidas la autenticación y la validación.
- Usa `request.locale` para elegir el idioma de cualquier texto que envíes, incluidos los mensajes de error de `Boom`, para que coincidan con el resto de la página.

## Solución de problemas

- **`request.getDictionary is not a function`**: el plugin no está registrado en el servidor al que pertenece la ruta. Regístralo en el servidor raíz o en el plugin que define la ruta.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **Siempre el locale por defecto**: ninguna fuente coincidió con la petición. El orden es el prefijo de la URL (`/tr/...`), `?locale=` o `?lang=`, la cookie `locale` y luego `Accept-Language`. Comprueba cuál envía realmente el cliente.
