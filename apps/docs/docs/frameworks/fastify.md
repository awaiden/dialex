# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` is wrapped with `fastify-plugin` (name `dialex-fastify`, Fastify `>=4`), so the request decorators are visible across encapsulation contexts. It is also the default export. All [locale detection options](../guide/locale-detection.md#options) apply.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register the plugin once on the root instance, before your routes and other plugins, so `req.locale` and `req.getDictionary` exist everywhere.
- Read the locale the adapter resolved instead of parsing `Accept-Language` or cookies yourself, so every route agrees with the middleware.

## Troubleshooting

- **`req.getDictionary` is undefined in a route**: the route was registered before the plugin. `await app.register(dialexPlugin, { ...dialex })` has to finish first.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
