# Vue / Nuxt

## Vue

Add the Vite plugin (see [React / Vite](./react.md#vite-plugin)), then install the plugin:

```ts
// src/main.ts
import { createApp } from "vue";
import { createI18n } from "dialex/vue";
import App from "./App.vue";

createApp(App)
  .use(createI18n({ defaultLocale: "en" }))
  .mount("#app");
```

```vue
<script setup lang="ts">
import { useI18n, useDictionary } from "dialex/vue";

const { locale, setLocale } = useI18n();
const dict = useDictionary("home");
</script>

<template>
  <h1>{{ dict.title }}</h1>
  <button @click="setLocale(locale === 'en' ? 'tr' : 'en')">Switch Locale ({{ locale }})</button>
</template>
```

| Export                | Description                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `createI18n(options)` | Vue plugin. Options: `defaultLocale` (falls back to the config, then `"en"`), `onLocaleChange(locale)`                                |
| `useI18n()`           | Returns `{ locale, setLocale }` where `locale` is a `Ref<string>`. Throws if the plugin is not installed                              |
| `useDictionary(name)` | Returns a `ComputedRef` of the dictionary for the current locale, falling back to the default locale. Use `dict.value` in script code |

With [lazy loading](../guide/lazy-loading.md) enabled, `useDictionary` is empty until the dictionary loads, and `preloadDictionaries(...names)` can load it ahead of time.

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["dialex/nuxt"],
  dialex: {
    defaultLocale: "en",
    locales: ["en", "tr"],
    cookieName: "locale",
  },
});
```

The module registers the Vite plugin, installs the Vue plugin with the selected locale persisted in a cookie (default name `locale`, read on the server too), and auto-imports `useI18n` and `useDictionary`. Config keys other than `cookieName` are the same as [Configuration](../guide/configuration.md).

::: warning
The Nuxt module is covered by unit tests of its setup calls only. It has not been run inside a full Nuxt application yet.
:::
