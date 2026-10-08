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

Registriere `i18n()` vor deinen Routen. Es fügt `ctx.locale` und `ctx.getDictionary(name)` hinzu. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
