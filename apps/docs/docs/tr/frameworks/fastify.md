# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

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

`dialexPlugin`, `fastify-plugin` ile sarılmıştır (ad `dialex-fastify`, Fastify `>=4`); bu yüzden istek dekoratörleri kapsülleme bağlamları arasında görünür. Aynı zamanda varsayılan dışa aktarımdır. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
