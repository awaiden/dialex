# Elysia

```ts
import { Elysia } from "elysia";
import { dialex } from "dialexjs/elysia";
import dictionaries from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

Das Plugin wird global registriert und leitet im Request-Kontext zwei Werte ab: `locale` und `getDictionary(name)`. Es setzt `Content-Language` in der Antwort, sofern `setHeader` nicht `false` ist. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten, und `custom` erhält den Elysia-Kontext.
