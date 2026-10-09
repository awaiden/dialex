# Astro

```ts
// src/middleware.ts
import { dialex } from "dialexjs/astro";

import dictionaries from "./dialex.generated.js";

export const onRequest = dialex({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

Combine it with other middleware using `sequence` from `astro:middleware`.

In pages and components, the locale and dictionary accessor are on `Astro.locals`, typed through an `App.Locals` augmentation:

```astro
---
const dict = Astro.locals.getDictionary("home");
---

<html lang={Astro.locals.locale}>
  <h1>{dict.title}</h1>
</html>
```

The middleware reads the request URL, headers, and cookies, so it applies to on-demand (SSR) routes. Statically prerendered pages have no request to inspect at build time. `Content-Language` is set unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the Astro context.
