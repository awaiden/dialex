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

`dialex()` işlevini rotalarınızdan önce kaydedin. `ctx.locale` ve `ctx.getDictionary(name)` ekler. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
