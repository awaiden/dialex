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

Die Middleware setzt `locale` und `getDictionary` als Kontextvariablen, die über `c.var` gelesen werden. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
