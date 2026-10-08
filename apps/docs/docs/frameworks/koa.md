# Koa

```ts
import Koa from "koa";
import Router from "@koa/router";
import { i18n } from "dialexjs/koa";
import dictionaries from "./src/i18n.generated.js";

const app = new Koa();
const router = new Router();

app.use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

Register `i18n()` before your routes. It adds `ctx.locale` and `ctx.getDictionary(name)`. All [locale detection options](../guide/locale-detection.md#options) apply.
