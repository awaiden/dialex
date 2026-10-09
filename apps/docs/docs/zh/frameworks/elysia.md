# Elysia

```ts
import { dialex } from "dialexjs/elysia";
import { Elysia } from "elysia";

import dictionaries from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

该插件以全局方式注册，并在请求上下文中派生出两个值：`locale` 和 `getDictionary(name)`。除非 `setHeader` 为 `false`，否则它会在响应中设置 `Content-Language`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用，`custom` 会接收到 Elysia 上下文。
