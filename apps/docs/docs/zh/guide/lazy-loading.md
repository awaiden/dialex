# 懒加载

默认情况下，所有词典都会预先打包。设置 `lazy: true` 后，Vite 插件会把每个词典文件拆分为独立的 chunk，并在组件首次需要时才加载。这适用于 [React / Vite](../frameworks/react.md) 和 [Vue / Nuxt](../frameworks/vue.md)。Next.js 已经按路由拆分代码，服务端适配器直接读取词典，[Angular](../frameworks/angular.md) 则显式接收词典，因此它们不受影响。

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning 拆分粒度
拆分是**按词典文件**进行的，而不是按 locale。每个文件会一起定义它的所有 locale（`defineDictionary("home", { en, tr })`），所以加载一个词典就会加载它的全部 locale。按 locale 拆分需要在构建时重写这些调用。要让 chunk 保持较小，请使用多个小词典（例如每个路由一个），而不是一个大词典。
:::

## React

`useDictionary` 会挂起，直到词典加载完成，因此请在 `<Suspense>` 下渲染它：

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

`t("dict.key")` 自身无法挂起，所以 `useT` 接收它要读取的词典名称。尚未加载的名称会记录一条警告并返回路径。

## Vue

`useDictionary` 返回一个 `ComputedRef`，在词典加载完成前为空，加载后会更新。在服务端渲染期间，渲染会等待它。

```vue
<script setup lang="ts">
import { useDictionary, preloadDictionaries } from "dialexjs/vue";

const dict = useDictionary("pricing");
</script>

<template>
  <h1>{{ dict.title }}</h1>
</template>
```

以同样的方式使用 `useT("pricing")`，并在路由守卫中使用 `preloadDictionaries("pricing")`。

## 注意事项

- 词典的名称是从源文本中读取的，不会执行代码，因此懒加载模式需要 `defineDictionary("name", ...)` 或字面量的 `name: "..."` 属性。否则构建会失败，并给出指明文件的消息。
- 配置中的 `locales` 仍然会被强制执行：加载缺少已配置 locale 的词典会以错误被拒绝。
- 加载结果按词典缓存。
