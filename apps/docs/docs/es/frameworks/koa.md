# Koa

```ts
import Koa from "koa";
import Router from "@koa/router";
import { i18n } from "dialexjs/koa";
import dictionaries from "./src/dialex.generated.js";

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

Registra `i18n()` antes de tus rutas. Añade `ctx.locale` y `ctx.getDictionary(name)`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
