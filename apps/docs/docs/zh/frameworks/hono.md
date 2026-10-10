# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

该中间件会把 `locale` 和 `getDictionary` 设置为上下文变量，通过 `c.var` 读取。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
