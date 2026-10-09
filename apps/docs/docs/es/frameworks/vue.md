# Vue / Nuxt

## Vue

Ejecuta `dx generate` y luego instala el plugin con el export `dialex` generado:

```ts
import { createDialex } from "dialexjs/vue";
// src/main.ts
import { createApp } from "vue";

import App from "./App.vue";
import { dialex } from "./dialex.generated";

createApp(App)
  .use(createDialex({ ...dialex, defaultLocale: "en" }))
  .mount("#app");
```

```vue
<script setup lang="ts">
import { useDialex, useDictionary } from "dialexjs/vue";

const { locale, setLocale } = useDialex();
const dict = useDictionary("home");
</script>

<template>
  <h1>{{ dict.title }}</h1>
  <button @click="setLocale(locale === 'en' ? 'tr' : 'en')">Switch Locale ({{ locale }})</button>
</template>
```

| Exportación             | Descripción                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)` | Plugin de Vue. Opciones: el `dialex` generado (`dictionaries`, `config`, `loaders`), `defaultLocale` (recurre a la configuración y luego a `"en"`), `onLocaleChange(locale)` |
| `useDialex()`           | Devuelve `{ locale, setLocale }`, donde `locale` es un `Ref<string>`. Lanza un error si el plugin no está instalado                                                          |
| `useDictionary(name)`   | Devuelve un `ComputedRef` del diccionario del locale actual, recurriendo al locale por defecto. Usa `dict.value` en el código del script                                     |

Con la [carga diferida](../guide/lazy-loading.md) activada, `useDictionary` está vacío hasta que se carga el diccionario, y `preloadDictionaries(...names)` puede cargarlo por adelantado.

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["dialexjs/nuxt"],
  dialex: {
    cookieName: "locale",
  },
});
```

El módulo instala el plugin de Vue con los diccionarios de `dialex.generated.ts` (se busca en el directorio de código, en la raíz del proyecto o en `src/`; usa `generated` para señalar otro sitio), guarda el locale elegido en una cookie (nombre por defecto `locale`, también se lee en el servidor) e importa automáticamente `useDialex` y `useDictionary`. Ejecuta primero `dx generate`. Todo lo demás, salvo `cookieName` y `generated`, viene de [Configuración](../guide/configuration.md).

::: warning
El módulo de Nuxt solo está cubierto por pruebas unitarias de sus llamadas de configuración. Todavía no se ha ejecutado dentro de una aplicación Nuxt completa.
:::
