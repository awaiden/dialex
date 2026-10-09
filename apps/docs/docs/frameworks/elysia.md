# Elysia

```ts
import { dialex } from "dialexjs/elysia";
import { Elysia } from "elysia";

import dictionaries from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialex({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

The plugin is registered globally and derives two values on the request context: `locale` and `getDictionary(name)`. It sets `Content-Language` on the response unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the Elysia context.
