# SvelteKit

## 钩子

```ts
// src/hooks.server.ts
import { i18nHandle } from "dialexjs/sveltekit";
import dictionaries from "./dialex.generated.js";

export const handle = i18nHandle({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

使用 `@sveltejs/kit/hooks` 中的 `sequence` 把它与其他钩子组合起来。

## Locals

`i18nHandle` 会填充 `event.locals.locale` 和 `event.locals.getDictionary(name)`，并扩展 `App.Locals`，使二者都有类型：

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
