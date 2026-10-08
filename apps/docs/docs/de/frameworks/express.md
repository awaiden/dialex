# Express

```ts
import express from "express";
import { i18n } from "dialexjs/express";
import dictionaries from "./src/i18n.generated.js";

const app = express();
app.use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

Die Middleware fügt `req.locale` und `req.getDictionary(name)` hinzu (auch an `res.locals`). Cookies werden aus `req.cookies` gelesen, wenn `cookie-parser` installiert ist, andernfalls aus dem Header `Cookie`. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
