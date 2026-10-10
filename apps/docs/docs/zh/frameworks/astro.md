# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
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

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 把中间件放在 `src/middleware.ts` 中，并在页面、布局和端点里从 `Astro.locals` 读取 locale；不要在每个页面中重新解析。
- 在布局中设置 `<html lang={Astro.locals.locale}>`，并为存在多种语言版本的页面用[路由辅助函数](../guide/routing.md)添加 `hreflang` 链接。

## 故障排除

- **`Astro.locals.getDictionary` is not a function**：Astro 只会加载 `src/middleware.ts`（或 `src/middleware/index.ts`）。请从那里导出 `onRequest`。
- **静态页面始终是同一种语言**：预渲染时没有请求。请按语言渲染路由（`/en/...`、`/tr/...`），或使用服务端输出。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
