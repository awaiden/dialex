# Fastify

```ts
import Fastify from "fastify";
import { i18nPlugin } from "dialexjs/fastify";
import dictionaries from "./src/i18n.generated.js";

const app = Fastify();

await app.register(i18nPlugin, {
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`i18nPlugin` is wrapped with `fastify-plugin` (name `dialex-fastify`, Fastify `>=4`), so the request decorators are visible across encapsulation contexts. It is also the default export. All [locale detection options](../guide/locale-detection.md#options) apply.
