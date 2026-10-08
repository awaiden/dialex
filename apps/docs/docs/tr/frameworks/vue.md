# Vue / Nuxt

## Vue

Vite eklentisini ekleyin ([React / Vite](./react.md#vite-plugin) bölümüne bakın), ardından eklentiyi kurun:

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

| Dışa aktarım          | Açıklama                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `createI18n(options)` | Vue eklentisi. Seçenekler: `defaultLocale` (yapılandırmaya, sonra `"en"` değerine döner), `onLocaleChange(locale)`                      |
| `useI18n()`           | `{ locale, setLocale }` döndürür; `locale` bir `Ref<string>`'dir. Eklenti kurulu değilse hata verir                                     |
| `useDictionary(name)` | Geçerli yerel ayar için sözlüğün bir `ComputedRef` değerini döndürür, varsayılan yerel ayara döner. Betik kodunda `dict.value` kullanın |

[Tembel yükleme](../guide/lazy-loading.md) etkinken `useDictionary`, sözlük yüklenene kadar boştur ve `preloadDictionaries(...names)` onu önceden yükleyebilir.

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

Modül Vite eklentisini kaydeder, Vue eklentisini seçilen yerel ayarın bir çerezde saklandığı biçimde kurar (varsayılan ad `locale`, sunucuda da okunur) ve `useI18n` ile `useDictionary` işlevlerini otomatik içe aktarır. `cookieName` dışındaki yapılandırma anahtarları [Yapılandırma](../guide/configuration.md) sayfasındakilerle aynıdır.

::: warning
Nuxt modülü yalnızca kurulum çağrılarını kapsayan birim testleriyle test edilmiştir. Henüz tam bir Nuxt uygulaması içinde çalıştırılmamıştır.
:::
