# Elysia

```ts
import { Elysia } from "elysia";
import { i18n } from "dialex/elysia";
import dictionaries from "./src/i18n.generated.js";

const app = new Elysia()
  .use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

The plugin is registered globally and derives two values on the request context: `locale` and `getDictionary(name)`. It sets `Content-Language` on the response unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the Elysia context.
