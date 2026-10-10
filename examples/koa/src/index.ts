import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./dialex.generated.js";

const app = new Koa();
const router = new Router();

// Register i18n middleware from the generated registry (dictionaries and locale config)
app.use(dialexKoa({ ...dialex }));

// Root route demonstrating ctx.getDictionary and ctx.locale
router.get("/", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = {
    locale: ctx.locale,
    title: dict.title,
    description: dict.description,
  };
});

// Path-based localized greeting route: /en/greet/Alice, /tr/greet/Ahmet
router.get("/:locale/greet/:name", (ctx) => {
  const dict = ctx.getDictionary("home");
  const name = ctx.params.name || "Guest";
  ctx.body = {
    locale: ctx.locale,
    message: dict.greeting(name),
  };
});

app.use(router.routes()).use(router.allowedMethods());

const port = Number(process.env.PORT) || 3005;
app.listen(port, () => {
  console.log(`[Koa] Server running at http://localhost:${port}`);
});

export default app;
