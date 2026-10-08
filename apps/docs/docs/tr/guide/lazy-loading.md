# Tembel Yükleme

Varsayılan olarak her sözlük baştan pakete eklenir. `lazy: true` ile Vite eklentisi her sözlük dosyasını kendi parçasına (chunk) ayırır ve bir bileşen ilk kez ihtiyaç duyduğunda yükler. Bu, [React / Vite](../frameworks/react.md) ve [Vue / Nuxt](../frameworks/vue.md) için geçerlidir. Next.js kodu zaten rota başına böler, sunucu adaptörleri sözlükleri doğrudan okur ve [Angular](../frameworks/angular.md) sözlüklerini açıkça alır; bu yüzden bunlar etkilenmez.

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning Ayrıntı düzeyi
Bölme yerel ayara göre değil, **sözlük dosyası başına** yapılır. Her dosya tüm yerel ayarlarını birlikte tanımlar (`defineDictionary("home", { en, tr })`), bu yüzden bir sözlüğü yüklemek onun tüm yerel ayarlarını yükler. Yerel ayar başına bölme, bu çağrıların derleme sırasında yeniden yazılmasını gerektirirdi. Parçaları küçük tutmak için tek büyük sözlük yerine birkaç küçük sözlük (örneğin rota başına bir tane) kullanın.
:::

## React

`useDictionary`, sözlük yüklenene kadar askıya alır; bu yüzden onu bir `<Suspense>` altında render edin:

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

`t("dict.key")` kendi başına askıya alamaz; bu yüzden `useT`, okuyacağı sözlüklerin adlarını alır. Henüz yüklenmemiş bir ad bir uyarı kaydeder ve yolu döndürür.

## Vue

`useDictionary`, sözlük yüklenene kadar boş olan, sonra güncellenen bir `ComputedRef` döndürür. Sunucu tarafı render sırasında render onu bekler.

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialexjs/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

`useT("pricing")` işlevini aynı şekilde kullanın; bir rota korumasında ise `preloadDictionaries("pricing")` kullanın.

## Notlar

- Sözlüğün adı kaynak metinden, çalıştırılmadan okunur; bu yüzden tembel mod `defineDictionary("name", ...)` ya da sabit bir `name: "..."` özelliği gerektirir. Aksi halde derleme, dosyanın adını belirten bir mesajla başarısız olur.
- Yapılandırmadaki `locales` yine uygulanır: yapılandırılmış bir yerel ayarı eksik olan bir sözlüğü yüklemek bir hatayla reddedilir.
- Yükleme sonuçları sözlük başına önbelleğe alınır.
