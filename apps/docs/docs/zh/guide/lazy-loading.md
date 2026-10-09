# 懒加载

默认情况下，所有词典都会预先打包。设置 `lazy: true` 后，`dx generate` 会写出动态导入而不是静态导入，于是打包器把每个词典文件拆成独立的 chunk，由 provider 在组件第一次需要时加载。这适用于 [React / Vite](../frameworks/react.md) 和 [Vue / Nuxt](../frameworks/vue.md)。Next.js 本来就按路由拆分代码，服务端适配器直接读取词典，[Angular](../frameworks/angular.md) 则显式接收词典，因此它们不受影响。

```ts
// dialex.config.ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lazy: true,
});
```

::: warning 拆分粒度
使用 `lazy: true` 时按**词典文件**拆分：每个文件把它的所有 locale 一起定义，因此加载一个词典会加载它的全部 locale。使用 `lazy: "locale"`（见下文）可同时按 locale 拆分。
:::

## 按 locale 拆分

设置 `lazy: "locale"` 后，`dx generate` 还会把每个词典按 locale 拆分，访客只下载自己阅读的语言：

```ts
// dialex.config.ts
export default defineConfig({
  locales: ["en", "tr"],
  lazy: "locale",
});
```

按 locale 拆分的模块会写入 `dialex.generated.ts` 旁边的 `dialex.locales/` 文件夹。请像生成文件一样提交它们；[`dialex check`](../cli/check.md) 会报告缺失或过期的文件。切换语言时按需下载新的 locale，在 React 中当前语言会一直显示到新语言到达为止（更新在 transition 中运行）。`preloadDictionaries(dialex, { locale: "tr" }, "pricing")` 可以提前下载。

只有当每个 locale 都是自包含的，词典才会被拆分。如果某个 locale 使用了文件中其他位置定义的内容（import 或辅助函数），`dx generate` 会保持该词典完整并说明原因。

## React

`useDictionary` 会挂起，直到词典加载完成，因此请在 `<Suspense>` 下渲染它：

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

以同样的方式使用 `useT("pricing")`，并在路由守卫中使用 `preloadDictionaries(dialex, "pricing")`。

## 注意事项

- 词典的名称是在不运行源码的情况下从源文本读取的，所以懒加载模式需要 `defineDictionary("name", ...)` 或字面量的 `name: "..."` 属性。否则 `dx generate` 会失败，并给出指明文件的消息。
- 懒加载模式适用于客户端包：生成的 `dictionaries` 导出为空，因此 `createDialexServer` 和服务端适配器需要一个非懒加载（eager）的生成文件。
- 加载结果按词典缓存。
