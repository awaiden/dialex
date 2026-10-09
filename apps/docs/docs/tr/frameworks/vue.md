# Vue / Nuxt

## Vue

`dx generate` çalıştırın, ardından eklentiyi üretilen `dialex` dışa aktarımıyla kurun:

```ts
// src/main.ts
import { createApp } from "vue";
import { createDialex } from "dialexjs/vue";
import { dialex } from "./dialex.generated";
import App from "./App.vue";

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

| Dışa aktarım            | Açıklama                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)` | Vue eklentisi. Seçenekler: üretilen `dialex` (`dictionaries`, `config`, `loaders`), `defaultLocale` (yapılandırmaya, sonra `"en"`'e geri döner), `onLocaleChange(locale)` |
| `useDialex()`           | `{ locale, setLocale }` döndürür; `locale` bir `Ref<string>`'dir. Eklenti kurulu değilse hata verir                                                                       |
| `useDictionary(name)`   | Geçerli yerel ayar için sözlüğün bir `ComputedRef` değerini döndürür, varsayılan yerel ayara döner. Betik kodunda `dict.value` kullanın                                   |

[Tembel yükleme](../guide/lazy-loading.md) etkinken `useDictionary`, sözlük yüklenene kadar boştur ve `preloadDictionaries(...names)` onu önceden yükleyebilir.

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

Modül, Vue eklentisini `dialex.generated.ts` içindeki sözlüklerle kurar (kaynak dizininde, proje kökünde veya `src/` içinde aranır; başka bir yeri göstermek için `generated` ayarlayın), seçilen yerel ayarı bir çerezde saklar (varsayılan ad `locale`, sunucuda da okunur) ve `useDialex` ile `useDictionary` işlevlerini otomatik içe aktarır. Önce `dx generate` çalıştırın. `cookieName` ve `generated` dışındaki her şey [Yapılandırma](../guide/configuration.md) sayfasından gelir.

::: warning
Nuxt modülü yalnızca kurulum çağrılarını kapsayan birim testleriyle test edilmiştir. Henüz tam bir Nuxt uygulaması içinde çalıştırılmamıştır.
:::
