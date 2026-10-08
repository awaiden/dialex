# Fastify

```ts
import Fastify from "fastify";
import { i18nPlugin } from "dialex/fastify";
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

`i18nPlugin` ist mit `fastify-plugin` umhüllt (Name `dialex-fastify`, Fastify `>=4`), sodass die Request-Dekoratoren über Kapselungskontexte hinweg sichtbar sind. Es ist außerdem der Default-Export. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
