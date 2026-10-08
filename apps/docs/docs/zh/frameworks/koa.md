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

请在路由之前注册 `i18n()`。它会添加 `ctx.locale` 和 `ctx.getDictionary(name)`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
