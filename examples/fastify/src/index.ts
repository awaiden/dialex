import Fastify from "fastify";
import { i18nPlugin } from "dialexjs/fastify";
import dictionaries from "./i18n.generated.js";

const app = Fastify({ logger: false });

// Register i18n plugin with auto-generated standalone dictionary bundle
await app.register(i18nPlugin, {
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

// Root route demonstrating req.getDictionary and req.locale
app.get("/", async (req) => {
  const dict = req.getDictionary("home");
  return {
    locale: req.locale,
    title: dict.title,
    description: dict.description,
  };
});

// Path-based localized greeting route: /en/greet/Alice, /tr/greet/Ahmet
app.get("/:locale/greet/:name", async (req) => {
  const dict = req.getDictionary("home");
  const { name = "Guest" } = req.params as { name?: string };
  return {
    locale: req.locale,
    message: dict.greeting(name),
  };
});

const port = Number(process.env.PORT) || 3004;
app.listen({ port }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[Fastify] Server listening at ${address}`);
});

export default app;
