# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
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

## Instalación

Instala el paquete del framework que ya usas junto con Dialex y luego compila los diccionarios:

```bash
npm install dialexjs astro
npm install -D @dialexjs/cli
npx dialex generate
```

## Opciones

El adaptador acepta las [opciones de detección de locale](../guide/locale-detection.md), `dictionaries` y `setHeader`. Cada opción, adaptador por adaptador, está en [Adaptadores de servidor](../api/server-adapters.md).

## TypeScript

`dialex generate` escribe `dialex-env.d.ts`. Con ese archivo incluido en `tsconfig.json` (y `moduleResolution` en `"bundler"` o `"nodenext"`), `Astro.locals.getDictionary("home")` autocompleta los nombres de diccionario, tipa el contenido, y `locale` es la unión de tus locales configurados.

## Enlaces y navegación

Si sus URL llevan la locale (`/tr/about`), construya los enlaces con `localizePath` de [Helpers de enrutamiento](../guide/routing.md) y la locale que muestra la aplicación. Dialex no incluye un componente de enlace para Astro: unas pocas líneas propias mantienen `Astro.redirect()` y las redirecciones funcionando igual, y muestran exactamente qué le pasa a una ruta. El `config` generado ya contiene `locales`, `defaultLocale` y `prefixDefault`, así que no se repite nada.

```astro
---
import { localizePath } from "dialexjs/routing";

import { config } from "../dialex.generated.js";

const { locale } = Astro.locals;
const localize = (path: string, to = locale) => localizePath(path, to, config);

// In a page that must send the visitor elsewhere: return Astro.redirect(localize("/login"));
---

<a href={localize("/about")}>About</a>
```

## Buenas prácticas

- Pasa `{ ...dialex }` de `dialex.generated.ts` al adaptador. Lleva los diccionarios y la configuración de locales, así que `defaultLocale`, `locales` y `fallbacks` se escriben una sola vez, en `dialex.config.ts`.
- Mantén el middleware en `src/middleware.ts` y lee el locale de `Astro.locals` en páginas, layouts y endpoints; no lo resuelvas de nuevo por página.
- Establece `<html lang={Astro.locals.locale}>` en tu layout y añade enlaces `hreflang` con los [ayudantes de enrutamiento](../guide/routing.md) para páginas que existen en varios idiomas.

## Solución de problemas

- **`Astro.locals.getDictionary` is not a function**: Astro solo carga `src/middleware.ts` (o `src/middleware/index.ts`). Exporta `onRequest` desde ahí.
- **Las páginas estáticas siempre están en un idioma**: con prerenderizado no hay petición. Renderiza rutas por idioma (`/en/...`, `/tr/...`) o usa salida de servidor.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
