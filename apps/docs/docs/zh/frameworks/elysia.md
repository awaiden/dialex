# Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";
import { Elysia } from "elysia";

import { dialex } from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

该插件以全局方式注册，并在请求上下文中派生出两个值：`locale` 和 `getDictionary(name)`。除非 `setHeader` 为 `false`，否则它会在响应中设置 `Content-Language`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用，`custom` 会接收到 Elysia 上下文。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在读取 `locale` 的路由之前用 `.use()` 添加插件；Elysia 按添加顺序应用插件。
- 保持 `setHeader` 开启，使响应带有 `Content-Language`；如果 CDN 或代理缓存了依赖该请求头的页面，请再添加 `Vary: Accept-Language`。

## 故障排除

- **`locale` 在处理函数中是 undefined**：插件加在了路由之后。请先链式调用 `.use(dialexElysia({ ...dialex }))`。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
