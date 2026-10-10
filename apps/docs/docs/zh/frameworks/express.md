# Express

```ts
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

该中间件会添加 `req.locale` 和 `req.getDictionary(name)`（同样添加到 `res.locals`）。安装了 `cookie-parser` 时，Cookie 从 `req.cookies` 读取，否则从 `Cookie` 请求头读取。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在路由之前注册适配器，这样每个处理函数都能看到 locale 和 `getDictionary`。
- 保持 `setHeader` 开启，使响应带有 `Content-Language`；如果 CDN 或代理缓存了依赖该请求头的页面，请再添加 `Vary: Accept-Language`。
- `cookie-parser` 是可选的：没有它时 Dialex 会自行读取 `Cookie` 请求头，因此不必仅为 locale 检测而安装它。

## 故障排除

- **`req.getDictionary is not a function`**：中间件注册在路由之后，或者根本没有注册。`app.use(dialexExpress({ ...dialex }))` 必须放在最前面。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
