# Koa

```ts
import Koa from "koa";
import Router from "@koa/router";
import { i18n } from "dialex/koa";
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

`i18n()` işlevini rotalarınızdan önce kaydedin. `ctx.locale` ve `ctx.getDictionary(name)` ekler. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
