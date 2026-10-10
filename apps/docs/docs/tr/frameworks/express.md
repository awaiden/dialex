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

Middleware `req.locale` ve `req.getDictionary(name)` ekler (ayrıca `res.locals` üzerine de). `cookie-parser` kuruluysa çerezler `req.cookies` içinden, aksi halde `Cookie` başlığından okunur. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
