# Koa

```ts
import Router from "@koa/router";
import { dialex } from "dialexjs/koa";
import Koa from "koa";

import dictionaries from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

请在路由之前注册 `dialex()`。它会添加 `ctx.locale` 和 `ctx.getDictionary(name)`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
