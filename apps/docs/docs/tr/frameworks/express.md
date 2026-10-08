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

Middleware `req.locale` ve `req.getDictionary(name)` ekler (ayrıca `res.locals` üzerine de). `cookie-parser` kuruluysa çerezler `req.cookies` içinden, aksi halde `Cookie` başlığından okunur. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
