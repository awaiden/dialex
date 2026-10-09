# Vue / Nuxt

## Vue

先运行 `dx generate`，再用生成的 `dialex` 导出安装插件：

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

| 导出                    | 说明                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createDialex(options)` | Vue 插件。选项：生成的 `dialex`（`dictionaries`、`config`、`loaders`）、`defaultLocale`（回退到配置，再回退到 `"en"`）、`onLocaleChange(locale)` |
| `useDialex()`           | 返回 `{ locale, setLocale }`，其中 `locale` 是 `Ref<string>`。如果未安装该插件则会抛出错误                                                       |
| `useDictionary(name)`   | 返回当前 locale 词典的 `ComputedRef`，并回退到默认 locale。在脚本代码中使用 `dict.value`                                                         |

启用[懒加载](../guide/lazy-loading.md)后，`useDictionary` 在词典加载完成前为空，并且可以用 `preloadDictionaries(...names)` 提前加载。

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

该模块使用 `dialex.generated.ts` 中的词典安装 Vue 插件（会在源码目录、项目根目录或 `src/` 中查找；用 `generated` 指向别处），把所选 locale 保存在 cookie 中（默认名称 `locale`，服务端也会读取），并自动导入 `useDialex` 和 `useDictionary`。请先运行 `dx generate`。除 `cookieName` 和 `generated` 外，其余都来自[配置](../guide/configuration.md)。

::: warning
Nuxt 模块目前只有针对其 setup 调用的单元测试。它尚未在完整的 Nuxt 应用中运行过。
:::
