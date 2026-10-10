# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

The middleware sets `locale` and `getDictionary` as context variables, read through `c.var`. All [locale detection options](../guide/locale-detection.md#options) apply.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register the adapter before your routes, so every handler sees the locale and `getDictionary`.
- The adapter only reads the request and the dictionaries you pass, so it runs on any runtime Hono supports (Node, Bun, Deno, Workers).

## Troubleshooting

- **`c.var.getDictionary` is undefined**: the middleware does not cover the route. Register it with `app.use("*", dialexHono({ ...dialex }))` before the routes.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
