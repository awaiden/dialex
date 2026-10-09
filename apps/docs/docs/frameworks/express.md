# Express

```ts
import express from "express";
import { i18n } from "dialexjs/express";
import dictionaries from "./src/dialex.generated.js";

const app = express();
app.use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

The middleware adds `req.locale` and `req.getDictionary(name)` (also on `res.locals`). Cookies are read from `req.cookies` when `cookie-parser` is installed, otherwise from the `Cookie` header. All [locale detection options](../guide/locale-detection.md#options) apply.
