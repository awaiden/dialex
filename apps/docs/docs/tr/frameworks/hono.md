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

Middleware, `locale` ve `getDictionary` değerlerini `c.var` üzerinden okunan bağlam değişkenleri olarak ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
