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

## Links und Navigation

Wenn Ihre URLs die Locale tragen (`/tr/about`), bauen Sie Links mit `localizePath` aus [Routing-Helfer](../guide/routing.md) und der Locale, die die App gerade zeigt. Dialex liefert keine Link-Komponente für Vue Router and Nuxt: ein paar eigene Zeilen halten `router.push()` und Weiterleitungen gleich und zeigen genau, was mit einem Pfad geschieht. Die generierte `config` enthält bereits `locales`, `defaultLocale` und `prefixDefault`, nichts wird wiederholt.

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

## Bewährte Vorgehensweisen

- Merke dir die Wahl in reinem Vue selbst: `createDialex` hat keine Persistenz, übergib also `onLocaleChange`, um ein Cookie oder `localStorage` zu schreiben, und lies es als `defaultLocale` zurück.
- In `<script setup>` gibt `useDictionary` eine berechnete Ref zurück: Lies `dict.value.title` im Skript und `dict.title` im Template, wo Vue sie entpackt.
- Lass in Nuxt das Modul `dialexjs/nuxt` das Plugin installieren und das Cookie verwalten; füge `createDialex` nicht zusätzlich selbst hinzu.

## Fehlerbehebung

- **`dict.title` ist im Skript undefiniert**: `useDictionary` gibt eine Ref zurück. Verwende `dict.value.title`.
- **`useDialex requires the plugin from createDialex() to be installed`**: `app.use(createDialex({ ...dialex }))` fehlt oder läuft, nachdem die Komponente erzeugt wurde.
- **`.vue`-Importe scheitern außerhalb des Editors an der Typprüfung**: Füge `src/env.d.ts` mit einem `declare module "*.vue"`-Shim hinzu oder prüfe die Typen mit `vue-tsc`.
