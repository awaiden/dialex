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

该中间件会添加 `req.locale` 和 `req.getDictionary(name)`（同样添加到 `res.locals`）。安装了 `cookie-parser` 时，Cookie 从 `req.cookies` 读取，否则从 `Cookie` 请求头读取。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
