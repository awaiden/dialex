# Express

```ts
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

The middleware adds `req.locale` and `req.getDictionary(name)` (also on `res.locals`). Cookies are read from `req.cookies` when `cookie-parser` is installed, otherwise from the `Cookie` header. All [locale detection options](../guide/locale-detection.md#options) apply.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register the adapter before your routes, so every handler sees the locale and `getDictionary`.
- Keep `setHeader` on so responses carry `Content-Language`, and add `Vary: Accept-Language` if a CDN or proxy caches pages that depend on that header.
- `cookie-parser` is optional: without it Dialex reads the `Cookie` header itself, so you do not have to install it only for locale detection.

## Troubleshooting

- **`req.getDictionary is not a function`**: the middleware is registered after the route, or not at all. `app.use(dialexExpress({ ...dialex }))` has to come first.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
