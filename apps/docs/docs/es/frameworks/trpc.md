# tRPC

`dialexjs/trpc` coloca el locale y los diccionarios en el contexto de tRPC, para que cada procedimiento pueda traducir sus propios errores y mensajes. No depende de `@trpc/server`; lee la petición que tu adaptador ya entrega a `createContext`. La detección por cabecera, cookie y query string funciona con todos los adaptadores; con los adaptadores de Express y standalone `req.url` es relativa a la ruta de montaje, así que un prefijo de locale en la ruta de la URL solo se ve cuando se pasa la URL completa en `url`.

```ts
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { title: dict.title, locale: ctx.locale };
  }),
});
```

`resolveDialex(request)` devuelve `{ locale, getDictionary, t }`. Expándelo en tu propio contexto, junto a la sesión o el manejador de la base de datos.

## Formas de la petición

El argumento puede ser un `Request` de Fetch, que pasan los adaptadores de fetch, Next.js y Cloudflare, o cualquier objeto con `headers` y un `url` opcional, que es lo que pasan los adaptadores de Express y standalone:

```ts
// Express adapter
createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ ...resolveDialex(req) }),
});
```

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` a `createDialexContext`. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Crea `resolveDialex` una sola vez, a nivel de módulo, y llámalo por petición dentro de `createContext`.
- Usa `ctx.getDictionary("errors")` para construir el mensaje de un `TRPCError`, de modo que los clientes reciban texto en su propio idioma.
- Las llamadas de tRPC suelen venir de tu propio frontend. Envía el locale como la cookie `locale` o la cabecera `Accept-Language`, que el navegador envía por sí mismo, en lugar de como entrada de cada procedimiento.

## Solución de problemas

- **El locale es siempre el predeterminado**: con el adaptador de Express, `req.url` es relativa a la ruta de montaje, así que un prefijo de locale en la ruta no se ve. Usa la cookie o `Accept-Language`, o pasa la URL original en `url`.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
- **`ctx.getDictionary` falta en un procedimiento**: `createContext` no devuelve el resultado de `resolveDialex`. Expándelo en el objeto que devuelves.
