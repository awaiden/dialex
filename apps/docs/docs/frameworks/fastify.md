# Fastify

```ts
import Fastify from "fastify";
import { dialexPlugin } from "dialexjs/fastify";
import dictionaries from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, {
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

`dialexPlugin` is wrapped with `fastify-plugin` (name `dialex-fastify`, Fastify `>=4`), so the request decorators are visible across encapsulation contexts. It is also the default export. All [locale detection options](../guide/locale-detection.md#options) apply.
