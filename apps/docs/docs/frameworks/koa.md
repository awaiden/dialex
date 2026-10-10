# Koa

```ts
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

Register `dialexKoa()` before your routes. It adds `ctx.locale` and `ctx.getDictionary(name)`. All [locale detection options](../guide/locale-detection.md#options) apply.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register the adapter before your routes, so every handler sees the locale and `getDictionary`.
- Use `ctx.locale` to pick the language of any text you send, including error responses, so they match the rest of the page.

## Troubleshooting

- **`ctx.getDictionary is not a function`**: `dialexKoa()` is registered after the router. Add it with `app.use` before `router.routes()`.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
