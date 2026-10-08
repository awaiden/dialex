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

`i18nPlugin` está envuelto con `fastify-plugin` (nombre `dialex-fastify`, Fastify `>=4`), de modo que los decoradores de la petición son visibles entre contextos de encapsulación. También es la exportación por defecto. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
