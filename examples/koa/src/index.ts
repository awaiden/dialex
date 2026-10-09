import Koa from "koa";
import Router from "@koa/router";
import { i18n } from "dialexjs/koa";
import dictionaries from "./dialex.generated.js";

const app = new Koa();
const router = new Router();

// Register i18n middleware with auto-generated standalone dictionary bundle
app.use(
  i18n({
    defaultLocale: "en",
    locales: ["en", "tr"],
    dictionaries,
  }),
);

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
