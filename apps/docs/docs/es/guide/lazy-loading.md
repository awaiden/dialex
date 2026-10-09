# Carga diferida

Por defecto, todos los diccionarios se incluyen de entrada en el bundle. Con `lazy: true`, `dx generate` escribe imports dinámicos en lugar de estáticos, de modo que tu bundler divide cada archivo de diccionario en su propio chunk y el provider lo carga cuando un componente lo necesita por primera vez. Esto se aplica a [React / Vite](../frameworks/react.md) y [Vue / Nuxt](../frameworks/vue.md). Next.js ya divide el código por ruta, los adaptadores de servidor leen los diccionarios directamente y [Angular](../frameworks/angular.md) recibe sus diccionarios de forma explícita, así que no se ven afectados.

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning Granularidad
La división es **por archivo de diccionario**, no por locale. Cada archivo define todos sus locales juntos (`defineDictionary("home", { en, tr })`), por lo que cargar un diccionario carga todos sus locales. Dividir por locale requeriría reescribir esas llamadas en tiempo de compilación. Para mantener los chunks pequeños, usa varios diccionarios pequeños (por ejemplo, uno por ruta) en lugar de uno grande.
:::

## React

`useDictionary` suspende hasta que el diccionario se ha cargado, así que renderízalo dentro de un `<Suspense>`:

```tsx
import { Suspense } from "react";
import { useDictionary, useT, preloadDictionaries } from "dialexjs/react";
import { dialex } from "./dialex.generated";

function Pricing() {
  const dict = useDictionary("pricing"); // suspends on first use
  return <h1>{dict.title}</h1>;
}

function Nav() {
  const t = useT("nav"); // name the dictionaries `t` will read
  return <a>{t("nav.about")}</a>;
}

<Suspense fallback={<Spinner />}>
  <Pricing />
</Suspense>;

// e.g. on hover, to avoid the fallback:
preloadDictionaries(dialex, "pricing");
```

`t("dict.key")` no puede suspender por sí mismo, por lo que `useT` recibe los nombres de los diccionarios que va a leer. Un nombre que aún no se ha cargado registra una advertencia y devuelve la ruta.

## Vue

`useDictionary` devuelve un `ComputedRef` que está vacío hasta que se carga el diccionario y después se actualiza. Durante el renderizado en el servidor, el renderizado lo espera.

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialexjs/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

Usa `useT("pricing")` de la misma forma, y `preloadDictionaries(dialex, "pricing")` en un guard de ruta.

## Notas

- El nombre de un diccionario se lee del texto fuente sin ejecutarlo, así que el modo diferido necesita `defineDictionary("name", ...)` o una propiedad `name: "..."` literal. De lo contrario, `dx generate` falla con un mensaje que nombra el archivo.
- El modo diferido es para bundles de cliente: el export `dictionaries` generado está vacío, así que `createDialexServer` y los adaptadores de servidor necesitan un archivo generado en modo normal (eager).
- Los resultados de carga se almacenan en caché por diccionario.
