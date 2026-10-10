# Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";
import { Elysia } from "elysia";

import { dialex } from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

The plugin is registered globally and derives two values on the request context: `locale` and `getDictionary(name)`. It sets `Content-Language` on the response unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the Elysia context.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Add the plugin with `.use()` before the routes that read `locale`; Elysia applies plugins in the order they are added.
- Keep `setHeader` on so responses carry `Content-Language`, and add `Vary: Accept-Language` if a CDN or proxy caches pages that depend on that header.

## Troubleshooting

- **`locale` is undefined in a handler**: the plugin was added after the route. Chain `.use(dialexElysia({ ...dialex }))` first.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
