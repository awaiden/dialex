import { Hono } from "hono";
import { dialex } from "dialexjs/hono";
import dictionaries from "./dialex.generated.js";

const app = new Hono();

// Register i18n middleware with auto-generated standalone dictionary bundle
app.use(
  "*",
  dialex({
    defaultLocale: "en",
    locales: ["en", "tr"],
    dictionaries,
  }),
);

// Root route demonstrating dictionary and active locale
app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({
    locale: c.var.locale,
    title: dict.title,
    description: dict.description,
  });
});

// Path-based localized greeting route: /en/greet/Alice, /tr/greet/Ahmet
app.get("/:locale/greet/:name", (c) => {
  const dict = c.var.getDictionary("home");
  const name = c.req.param("name") || "Guest";
  return c.json({
    locale: c.var.locale,
    message: dict.greeting(name),
  });
});

const port = Number(process.env.PORT) || 3001;
console.log(`[Hono] Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
