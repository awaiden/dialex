# Hono

```ts
import { Hono } from "hono";
import { i18n } from "dialexjs/hono";
import dictionaries from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

The middleware sets `locale` and `getDictionary` as context variables, read through `c.var`. All [locale detection options](../guide/locale-detection.md#options) apply.
