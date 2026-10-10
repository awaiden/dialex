# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` ist mit `fastify-plugin` umhüllt (Name `dialex-fastify`, Fastify `>=4`), sodass die Request-Dekoratoren über Kapselungskontexte hinweg sichtbar sind. Es ist außerdem der Default-Export. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
