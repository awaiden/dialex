# Astro

```ts
// src/middleware.ts
import { dialex } from "dialexjs/astro";

import dictionaries from "./dialex.generated.js";

export const onRequest = dialex({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

使用 `astro:middleware` 中的 `sequence` 把它与其他中间件组合起来。

在页面和组件中，locale 和词典访问器位于 `Astro.locals` 上，并通过 `App.Locals` 的扩展获得类型：

```astro
---
const dict = Astro.locals.getDictionary("home");
---

<html lang={Astro.locals.locale}>
  <h1>{dict.title}</h1>
</html>
```

该中间件读取请求 URL、请求头和 Cookie，因此适用于按需渲染（SSR）的路由。静态预渲染的页面在构建时没有可检查的请求。除非 `setHeader` 为 `false`，否则会设置 `Content-Language`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用，`custom` 会接收到 Astro 上下文。
