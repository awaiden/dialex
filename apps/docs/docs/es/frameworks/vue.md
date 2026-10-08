# Vue / Nuxt

## Vue

Añade el plugin de Vite (consulta [React / Vite](./react.md#vite-plugin)) y después instala el plugin:

```ts
// src/main.ts
import { createApp } from "vue";
import { createI18n } from "dialexjs/vue";
import App from "./App.vue";

createApp(App)
  .use(createI18n({ defaultLocale: "en" }))
  .mount("#app");
```

```vue
<script setup lang="ts">
import { useI18n, useDictionary } from "dialexjs/vue";

const { locale, setLocale } = useI18n();
const dict = useDictionary("home");
</script>

<template>
  <h1>{{ dict.title }}</h1>
  <button @click="setLocale(locale === 'en' ? 'tr' : 'en')">Switch Locale ({{ locale }})</button>
</template>
```

| Exportación           | Descripción                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `createI18n(options)` | Plugin de Vue. Opciones: `defaultLocale` (recurre a la configuración y luego a `"en"`), `onLocaleChange(locale)`                         |
| `useI18n()`           | Devuelve `{ locale, setLocale }`, donde `locale` es un `Ref<string>`. Lanza un error si el plugin no está instalado                      |
| `useDictionary(name)` | Devuelve un `ComputedRef` del diccionario del locale actual, recurriendo al locale por defecto. Usa `dict.value` en el código del script |

Con la [carga diferida](../guide/lazy-loading.md) activada, `useDictionary` está vacío hasta que se carga el diccionario, y `preloadDictionaries(...names)` puede cargarlo por adelantado.

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["dialexjs/nuxt"],
  dialex: {
    defaultLocale: "en",
    locales: ["en", "tr"],
    cookieName: "locale",
  },
});
```

El módulo registra el plugin de Vite, instala el plugin de Vue con el locale seleccionado guardado en una cookie (nombre por defecto `locale`, que también se lee en el servidor) e importa automáticamente `useI18n` y `useDictionary`. Las claves de configuración distintas de `cookieName` son las mismas que en [Configuración](../guide/configuration.md).

::: warning
El módulo de Nuxt solo está cubierto por pruebas unitarias de sus llamadas de configuración. Todavía no se ha ejecutado dentro de una aplicación Nuxt completa.
:::
