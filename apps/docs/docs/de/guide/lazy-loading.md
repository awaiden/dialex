# Lazy Loading

Standardmäßig wird jedes Wörterbuch von Anfang an gebündelt. Mit `lazy: true` teilt das Vite-Plugin jede Wörterbuchdatei in einen eigenen Chunk auf und lädt ihn, sobald eine Komponente ihn zum ersten Mal braucht. Das gilt für [React / Vite](../frameworks/react.md) und [Vue / Nuxt](../frameworks/vue.md). Next.js teilt den Code bereits pro Route auf, die Server-Adapter lesen Wörterbücher direkt, und [Angular](../frameworks/angular.md) erhält seine Wörterbücher explizit; sie sind daher nicht betroffen.

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning Granularität
Aufgeteilt wird **pro Wörterbuchdatei**, nicht pro Locale. Jede Datei definiert alle ihre Locales gemeinsam (`defineDictionary("home", { en, tr })`), daher lädt das Laden eines Wörterbuchs alle seine Locales. Eine Aufteilung pro Locale würde erfordern, diese Aufrufe zur Build-Zeit umzuschreiben. Um die Chunks klein zu halten, verwende mehrere kleine Wörterbücher (zum Beispiel eines pro Route) statt eines großen.
:::

## React

`useDictionary` suspendiert, bis das Wörterbuch geladen ist, rendere es daher unter `<Suspense>`:

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

`t("dict.key")` kann nicht von selbst suspendieren, deshalb nimmt `useT` die Namen der Wörterbücher entgegen, die es lesen wird. Ein Name, der noch nicht geladen ist, protokolliert eine Warnung und gibt den Pfad zurück.

## Vue

`useDictionary` liefert eine `ComputedRef`, die leer ist, bis das Wörterbuch geladen ist, und sich dann aktualisiert. Beim Server-Side-Rendering wartet das Rendering darauf.

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialex/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

Verwende `useT("pricing")` genauso, und `preloadDictionaries("pricing")` in einem Route-Guard.

## Hinweise

- Der Name eines Wörterbuchs wird aus dem Quelltext gelesen, ohne ihn auszuführen. Der Lazy-Modus benötigt daher `defineDictionary("name", ...)` oder eine literale Eigenschaft `name: "..."`. Andernfalls schlägt der Build mit einer Meldung fehl, die die Datei nennt.
- `locales` in der Konfiguration wird weiterhin durchgesetzt: Das Laden eines Wörterbuchs, dem ein konfiguriertes Locale fehlt, wird mit einem Fehler abgelehnt.
- Ladeergebnisse werden pro Wörterbuch zwischengespeichert.
