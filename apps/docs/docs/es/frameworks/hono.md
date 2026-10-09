# Hono

```ts
import { Hono } from "hono";
import { dialex } from "dialexjs/hono";
import dictionaries from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

El middleware establece `locale` y `getDictionary` como variables de contexto, que se leen mediante `c.var`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
