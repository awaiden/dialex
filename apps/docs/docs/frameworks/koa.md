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

Register `dialex()` before your routes. It adds `ctx.locale` and `ctx.getDictionary(name)`. All [locale detection options](../guide/locale-detection.md#options) apply.
