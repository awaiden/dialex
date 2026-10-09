# Elysia

```ts
import { Elysia } from "elysia";
import { i18n } from "dialexjs/elysia";
import dictionaries from "./src/dialex.generated.js";

const app = new Elysia()
  .use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

El plugin se registra de forma global y deriva dos valores en el contexto de la petición: `locale` y `getDictionary(name)`. Establece `Content-Language` en la respuesta a menos que `setHeader` sea `false`. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options), y `custom` recibe el contexto de Elysia.
