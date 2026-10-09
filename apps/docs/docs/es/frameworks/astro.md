# Astro

```ts
// src/middleware.ts
import { dialex } from "dialexjs/astro";
import dictionaries from "./dialex.generated.js";

export const onRequest = dialex({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
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
