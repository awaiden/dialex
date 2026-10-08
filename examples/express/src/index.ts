import express from "express";
import { i18n } from "dialexjs/express";
import dictionaries from "./i18n.generated.js";

const app = express();

// Register i18n middleware with auto-generated standalone dictionary bundle
app.use(
  i18n({
    defaultLocale: "en",
    locales: ["en", "tr"],
    dictionaries,
  }),
);

// Root route demonstrating req.getDictionary and req.locale
app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({
    locale: req.locale,
    title: dict.title,
    description: dict.description,
  });
});

// Path-based localized greeting route: /en/greet/Alice, /tr/greet/Ahmet
app.get("/:locale/greet/:name", (req, res) => {
  const dict = req.getDictionary("home");
  const name = req.params.name || "Guest";
  res.json({
    locale: req.locale,
    message: dict.greeting(name),
  });
});

const port = Number(process.env.PORT) || 3002;
app.listen(port, () => {
  console.log(`[Express] Server running at http://localhost:${port}`);
});

export default app;
