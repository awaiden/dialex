# Hono

```ts
import { Hono } from "hono";
import { i18n } from "dialex/hono";
import dictionaries from "./src/i18n.generated.js";

const app = new Hono();
app.use("*", i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

该中间件会把 `locale` 和 `getDictionary` 设置为上下文变量，通过 `c.var` 读取。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
