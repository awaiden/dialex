# Vue / Nuxt

## Vue

Füge das Vite-Plugin hinzu (siehe [React / Vite](./react.md#vite-plugin)) und installiere dann das Plugin:

```ts
// src/main.ts
import { createApp } from "vue";
import { createDialex } from "dialexjs/vue";
import App from "./App.vue";

createApp(App)
  .use(createDialex({ defaultLocale: "en" }))
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

| Export                  | Beschreibung                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createDialex(options)` | Vue-Plugin. Optionen: `defaultLocale` (fällt auf die Konfiguration, dann auf `"en"` zurück), `onLocaleChange(locale)`                            |
| `useDialex()`           | Liefert `{ locale, setLocale }`, wobei `locale` eine `Ref<string>` ist. Wirft einen Fehler, wenn das Plugin nicht installiert ist                |
| `useDictionary(name)`   | Liefert eine `ComputedRef` des Wörterbuchs für das aktuelle Locale und fällt auf das Standard-Locale zurück. Verwende im Skriptcode `dict.value` |

Ist [Lazy Loading](../guide/lazy-loading.md) aktiviert, ist `useDictionary` leer, bis das Wörterbuch geladen ist, und `preloadDictionaries(...names)` kann es vorab laden.

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

Das Modul registriert das Vite-Plugin, installiert das Vue-Plugin mit dem ausgewählten Locale, das in einem Cookie gespeichert wird (Standardname `locale`, auch auf dem Server gelesen), und importiert `useDialex` und `useDictionary` automatisch. Andere Konfigurationsschlüssel als `cookieName` entsprechen denen unter [Konfiguration](../guide/configuration.md).

::: warning
Das Nuxt-Modul ist nur durch Unit-Tests seiner Setup-Aufrufe abgedeckt. Es wurde noch nicht in einer vollständigen Nuxt-Anwendung ausgeführt.
:::
