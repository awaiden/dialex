# Vue / Nuxt

## Vue

`dx generate` çalıştırın, ardından eklentiyi üretilen `dialex` dışa aktarımıyla kurun:

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

## Bağlantılar ve gezinme

URL'leriniz locale taşıyorsa (`/tr/about`), bağlantıları [Yönlendirme Yardımcıları](../guide/routing.md) sayfasındaki `localizePath` ve uygulamanın gösterdiği locale ile oluşturun. Dialex'in Vue Router and Nuxt için hazır bir bağlantı bileşeni yoktur: kendi yazacağınız birkaç satır `router.push()` ve yönlendirmelerin aynı şekilde çalışmasını sağlar ve bir yola tam olarak ne olduğunu gösterir. Üretilen `config` zaten `locales`, `defaultLocale` ve `prefixDefault` değerlerini taşır, bu yüzden hiçbir şey tekrar yazılmaz.

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

## En iyi uygulamalar

- Düz Vue'da seçimi kendiniz saklayın: `createDialex` kalıcılık sunmaz; bir çerez veya `localStorage` yazmak için `onLocaleChange` geçirin ve `defaultLocale` olarak geri okuyun.
- `<script setup>` içinde `useDictionary` hesaplanmış bir ref döndürür: script kodunda `dict.value.title`, şablonda ise Vue'nun açtığı `dict.title` okuyun.
- Nuxt ile eklentiyi kurma ve çerezi yönetme işini `dialexjs/nuxt` modülüne bırakın; ayrıca kendiniz `createDialex` eklemeyin.

## Sorun giderme

- **`dict.title` script kodunda tanımsız**: `useDictionary` bir ref döndürür. `dict.value.title` kullanın.
- **`useDialex requires the plugin from createDialex() to be installed`**: `app.use(createDialex({ ...dialex }))` eksik veya bileşen oluşturulduktan sonra çalışıyor.
- **`.vue` içe aktarımları editör dışında tip denetiminden geçmiyor**: `declare module "*.vue"` gölgesi içeren `src/env.d.ts` ekleyin veya tipleri `vue-tsc` ile denetleyin.
