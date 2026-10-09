# Lazy Loading

By default every dictionary is bundled up front. With `lazy: true`, `dx generate` writes dynamic imports instead of static ones, so your bundler splits each dictionary file into its own chunk and the provider loads it when a component first needs it. This applies to [React / Vite](../frameworks/react.md) and [Vue / Nuxt](../frameworks/vue.md). Next.js already splits code per route, the server adapters read dictionaries directly, and [Angular](../frameworks/angular.md) receives its dictionaries explicitly, so they are unaffected.

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning Granularity
With `lazy: true` splitting is **per dictionary file**: each file defines all of its locales together, so loading one dictionary loads every locale of it. Use `lazy: "locale"` (below) to split per locale as well.
:::

## Per locale

With `lazy: "locale"`, `dx generate` also splits each dictionary per locale, so a visitor only downloads the language they read:

```ts
// dialex.config.ts
export default defineConfig({
  locales: ["en", "tr"],
  lazy: "locale",
});
```

The per-locale modules are written to a `dialex.locales/` folder next to `dialex.generated.ts`. Commit them like the generated file; [`dialex check`](../cli/check.md) reports missing or out-of-date ones. Switching language downloads the new locale on demand, and in React the current language stays on screen until the new one has arrived (the update runs in a transition). `preloadDictionaries(dialex, { locale: "tr" }, "pricing")` fetches ahead of time.

A dictionary is split only when each locale is self-contained. If a locale uses something defined elsewhere in the file (an import or a helper), `dx generate` keeps that dictionary whole and says why.

## React

`useDictionary` suspends until the dictionary has loaded, so render it under `<Suspense>`:

```tsx
import { useDictionary, useT, preloadDictionaries } from "dialexjs/react";
import { Suspense } from "react";

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

Use `useT("pricing")` the same way, and `preloadDictionaries(dialex, "pricing")` in a route guard.

## Notes

- A dictionary's name is read from the source text without running it, so lazy mode needs `defineDictionary("name", ...)` or a literal `name: "..."` property. Otherwise `dx generate` fails with a message naming the file.
- Lazy mode is for client bundles: the generated `dictionaries` export is empty, so `createDialexServer` and the server adapters need an eager generated file.
- Load results are cached per dictionary.
