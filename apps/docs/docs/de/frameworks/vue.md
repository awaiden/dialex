# Vue / Nuxt

## Vue

Führe `dx generate` aus und installiere dann das Plugin mit dem generierten Export `dialex`:

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

| Export                  | Beschreibung                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createDialex(options)` | Vue-Plugin. Optionen: das generierte `dialex` (`dictionaries`, `config`, `loaders`), `defaultLocale` (fällt auf die Konfiguration zurück, dann auf `"en"`), `onLocaleChange(locale)` |
| `useDialex()`           | Liefert `{ locale, setLocale }`, wobei `locale` eine `Ref<string>` ist. Wirft einen Fehler, wenn das Plugin nicht installiert ist                                                    |
| `useDictionary(name)`   | Liefert eine `ComputedRef` des Wörterbuchs für das aktuelle Locale und fällt auf das Standard-Locale zurück. Verwende im Skriptcode `dict.value`                                     |

Ist [Lazy Loading](../guide/lazy-loading.md) aktiviert, ist `useDictionary` leer, bis das Wörterbuch geladen ist, und `preloadDictionaries(...names)` kann es vorab laden.

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

Das Modul installiert das Vue-Plugin mit den Wörterbüchern aus `dialex.generated.ts` (gesucht im Quellverzeichnis, im Projektstamm oder in `src/`; mit `generated` zeigst du auf einen anderen Ort), speichert das gewählte Locale in einem Cookie (Standardname `locale`, auch auf dem Server gelesen) und importiert `useDialex` und `useDictionary` automatisch. Führe zuerst `dx generate` aus. Alles außer `cookieName` und `generated` stammt aus der [Konfiguration](../guide/configuration.md).

::: warning
Das Nuxt-Modul ist nur durch Unit-Tests seiner Setup-Aufrufe abgedeckt. Es wurde noch nicht in einer vollständigen Nuxt-Anwendung ausgeführt.
:::
