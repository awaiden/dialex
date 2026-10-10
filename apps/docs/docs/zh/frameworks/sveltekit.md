# SvelteKit

## 钩子

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });
```

使用 `@sveltejs/kit/hooks` 中的 `sequence` 把它与其他钩子组合起来。

## Locals

`dialexHandle` 会填充 `event.locals.locale` 和 `event.locals.getDictionary(name)`，并扩展 `App.Locals`，使二者都有类型：

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## 文档语言

把占位符放在 `src/app.html` 中；每次响应时它都会被替换为解析出的 locale：

```html
<html lang="%dialex.lang%"></html>
```

除非 `setHeader` 为 `false`，否则会设置 `Content-Language`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用，`custom` 会接收到请求事件。

## 最佳实践

- 在服务端用 `dialexHandle` 解析 locale，并从根 `+layout.server.ts` 传给浏览器。在组件中配合 `initialLocale` 使用 [`dialexjs/svelte`](./svelte.md)，使客户端首次渲染与 HTML 一致。
- 用 `@sveltejs/kit/hooks` 中的 `sequence` 把 `dialexHandle` 与其他 hooks 组合起来，并把它放在最前面，使后面的 hooks 能读取 `event.locals.locale`。
- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。

## 故障排除

- **`locals.getDictionary` is not a function**：`handle` 没有从 `src/hooks.server.ts` 导出，或者 `dialexHandle` 不在其中。请导出 `handle = dialexHandle({ ...dialex })`。
- **`getDictionary` 返回 `any`**：缺少类型注册表。运行 `dx generate`，并确认 `dialex-env.d.ts` 已被 `tsconfig` 包含。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
