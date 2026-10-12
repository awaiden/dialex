# Vue / Nuxt

## Vue

Run `dx generate`, then install the plugin with the generated `dialex` export:

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

| Export                  | Description                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)` | Vue plugin. Options: the generated `dialex` (`dictionaries`, `config`, `loaders`), `defaultLocale` (falls back to the config, then `"en"`), `onLocaleChange(locale)` |
| `useDialex()`           | Returns `{ locale, setLocale }` where `locale` is a `Ref<string>`. Throws if the plugin is not installed                                                             |
| `useDictionary(name)`   | Returns a `ComputedRef` of the dictionary for the current locale, falling back to the default locale. Use `dict.value` in script code                                |

With [lazy loading](../guide/lazy-loading.md) enabled, `useDictionary` is empty until the dictionary loads, and `preloadDictionaries(...names)` can load it ahead of time.

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

The module installs the Vue plugin with the dictionaries from `dialex.generated.ts` (found in the source directory, the project root or `src/`; set `generated` to point elsewhere), persists the selected locale in a cookie (default name `locale`, read on the server too), and auto-imports `useDialex` and `useDictionary`. Run `dx generate` first. Everything except `cookieName` and `generated` comes from [Configuration](../guide/configuration.md).

::: warning
The Nuxt module is covered by unit tests of its setup calls only. It has not been run inside a full Nuxt application yet.
:::

## Links and navigation

If your URLs carry the locale (`/tr/about`), build links with `localizePath` from [Routing Helpers](../guide/routing.md) and the locale the app is showing. Dialex has no link component for Vue Router and Nuxt: a few lines of your own keep `router.push()` and redirects working the same way, and show exactly what happens to a path. The generated `config` already holds `locales`, `defaultLocale` and `prefixDefault`, so nothing is repeated.

```ts
import { localizePath } from "dialexjs/routing";
// src/composables/useLocalizedPath.ts
import { useDialex } from "dialexjs/vue";

import { config } from "../dialex.generated";

export function useLocalizedPath() {
  const { locale } = useDialex();
  return (path: string, to = locale.value) => localizePath(path, to, config);
}
```

```vue
<script setup lang="ts">
import { useRouter } from "vue-router";

import { useLocalizedPath } from "./composables/useLocalizedPath";

const localize = useLocalizedPath();
const router = useRouter();
// In Nuxt: <NuxtLink :to="localize('/about')"> and navigateTo(localize("/cart"))
</script>

<template>
  <RouterLink :to="localize('/about')">About</RouterLink>
  <button @click="router.push(localize('/cart'))">Cart</button>
</template>
```

## Best practices

- Remember the choice yourself in plain Vue: `createDialex` has no persistence, so pass `onLocaleChange` to write a cookie or `localStorage`, and read it back as `defaultLocale`.
- In `<script setup>`, `useDictionary` returns a computed ref: read `dict.value.title` in script code and `dict.title` in the template, where Vue unwraps it.
- With Nuxt, let the `dialexjs/nuxt` module install the plugin and manage the cookie; do not add `createDialex` yourself as well.

## Troubleshooting

- **`dict.title` is undefined in script code**: `useDictionary` returns a ref. Use `dict.value.title`.
- **`useDialex requires the plugin from createDialex() to be installed`**: `app.use(createDialex({ ...dialex }))` is missing or runs after the component was created.
- **`.vue` imports fail the type check outside the editor**: add `src/env.d.ts` with a `declare module "*.vue"` shim, or type-check with `vue-tsc`.
