# Carga diferida

Por defecto, todos los diccionarios se incluyen en el bundle desde el principio. Con `lazy: true`, el plugin de Vite separa cada archivo de diccionario en su propio chunk y lo carga cuando un componente lo necesita por primera vez. Esto se aplica a [React / Vite](../frameworks/react.md) y a [Vue / Nuxt](../frameworks/vue.md). Next.js ya divide el código por ruta, los adaptadores de servidor leen los diccionarios directamente y [Angular](../frameworks/angular.md) recibe sus diccionarios de forma explícita, así que no se ven afectados.

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
import { useDictionary, useT, preloadDictionaries } from "dialex/react";

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
preloadDictionaries("pricing");
```

`t("dict.key")` no puede suspender por sí mismo, por lo que `useT` recibe los nombres de los diccionarios que va a leer. Un nombre que aún no se ha cargado registra una advertencia y devuelve la ruta.

## Vue

`useDictionary` devuelve un `ComputedRef` que está vacío hasta que se carga el diccionario y después se actualiza. Durante el renderizado en el servidor, el renderizado lo espera.

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialex/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

Usa `useT("pricing")` de la misma forma, y `preloadDictionaries("pricing")` en un guard de ruta.

## Notas

- El nombre de un diccionario se lee del texto fuente sin ejecutarlo, por lo que el modo diferido necesita `defineDictionary("name", ...)` o una propiedad literal `name: "..."`. De lo contrario, la compilación falla con un mensaje que indica el archivo.
- `locales` en la configuración se sigue exigiendo: cargar un diccionario al que le falta un locale configurado se rechaza con un error.
- Los resultados de carga se almacenan en caché por diccionario.
