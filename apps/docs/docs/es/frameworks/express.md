# Express

```ts
import { dialex } from "dialexjs/express";
import express from "express";

import dictionaries from "./src/dialex.generated.js";

const app = express();
app.use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

El middleware añade `req.locale` y `req.getDictionary(name)` (también en `res.locals`). Las cookies se leen de `req.cookies` cuando `cookie-parser` está instalado y, si no, de la cabecera `Cookie`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
