# Fetch API (Request)

`dialex/web` resuelve el locale a partir de una `Request` estándar. Úsalo en cualquier framework o runtime que te entregue una: loaders de React Router y Remix, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createI18nHandler } from "dialex/web";
import dictionaries from "./i18n.generated.js";

export const resolveI18n = createI18nHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveI18n(request);
```

| Resultado                | Descripción                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `locale`                 | El locale detectado                                                                                                  |
| `getDictionary(name)`    | Contenido del diccionario para ese locale, siguiendo los [fallbacks](../guide/fallbacks.md)                          |
| `t(path, ...args)`       | [Traductor por ruta de claves](../guide/key-paths.md)                                                                |
| `headers`                | `{ "Content-Language": locale }` (vacío cuando `setHeader` es `false`)                                               |
| `applyHeaders(response)` | Devuelve la respuesta con esas cabeceras; la copia si sus cabeceras son inmutables (por ejemplo `Response.redirect`) |

El orden de detección y las opciones son los mismos que en los demás adaptadores: consulta [Detección de locale](../guide/locale-detection.md).

## Recetas

Muestran cómo encajan las piezas. Solo `dialex/web` está cubierto por las pruebas de Dialex; la conexión con los frameworks que se muestra a continuación no se ha ejecutado en aplicaciones reales, así que contrástala con la documentación actual de tu framework.

### React Router / Remix

Los loaders reciben la `Request`:

```ts
export async function loader({ request }: { request: Request }) {
  const { locale, getDictionary } = await resolveI18n(request);
  return { locale, title: getDictionary("home").title };
}
```

Devuelve los datos a tu componente y renderízalos allí. Envuelve la respuesta con `applyHeaders` si la construyes tú mismo.

### TanStack Start y SolidStart

Lee la petición actual con el helper de servidor de tu framework y pásala a `resolveI18n`. Por ejemplo, en SolidStart, `getRequestEvent()?.request` devuelve la `Request` activa. Como la llamada necesita un contexto de servidor, úsala en funciones de servidor o en middleware, no en código de cliente.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const i18n = await resolveI18n(request);
    return i18n.applyHeaders(new Response(i18n.getDictionary("home").title));
  },
};
```
