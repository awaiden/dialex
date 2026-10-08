# Lazy Loading

By default every dictionary is bundled up front. With `lazy: true` the Vite plugin splits each dictionary file into its own chunk and loads it when a component first needs it. This applies to [React / Vite](../frameworks/react.md) and [Vue / Nuxt](../frameworks/vue.md). Next.js already splits code per route, the server adapters read dictionaries directly, and [Angular](../frameworks/angular.md) receives its dictionaries explicitly, so they are unaffected.

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning Granularity
Splitting is **per dictionary file**, not per locale. Each file defines all of its locales together (`defineDictionary("home", { en, tr })`), so loading one dictionary loads every locale of it. Per-locale splitting would require rewriting those calls at build time. To keep chunks small, use several small dictionaries (for example one per route) instead of one large one.
:::

## React

`useDictionary` suspends until the dictionary has loaded, so render it under `<Suspense>`:

```tsx
import { Suspense } from "react";
import { useDictionary, useT, preloadDictionaries } from "dialexjs/react";

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

`t("dict.key")` cannot suspend on its own, so `useT` takes the names of the dictionaries it will read. A name that is not loaded yet logs a warning and returns the path.

## Vue

`useDictionary` returns a `ComputedRef` that is empty until the dictionary loads, then updates. During server-side rendering the render waits for it.

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialexjs/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

Use `useT("pricing")` the same way, and `preloadDictionaries("pricing")` in a route guard.

## Notes

- A dictionary's name is read from the source text without running it, so lazy mode needs `defineDictionary("name", ...)` or a literal `name: "..."` property. Otherwise the build fails with a message naming the file.
- `locales` in the config is still enforced: loading a dictionary that lacks a configured locale rejects with an error.
- Load results are cached per dictionary.
