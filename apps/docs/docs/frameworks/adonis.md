# AdonisJS

`dialexjs/adonis` builds a middleware class for AdonisJS 6 and later. Create it in a middleware file:

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });
```

The import above reads the generated file from `start/`. Set `output` in `dialex.config.ts` to put it there (`dialex init` does this for AdonisJS):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "start/dialex.generated.ts",
});
```

Register it as a router middleware, so it runs for every route:

```ts
// start/kernel.ts
import router from "@adonisjs/core/services/router";

router.use([() => import("#middleware/dialex_middleware")]);
```

Handlers then read `ctx.locale` and `ctx.getDictionary(name)`:

```ts
// start/routes.ts
import router from "@adonisjs/core/services/router";

router.get("/:locale", ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { title: dict.title, locale };
});
```

The middleware also sets the `Content-Language` response header. All [locale detection options](../guide/locale-detection.md#options) apply.

## Install

Install the framework package you already use together with Dialex, then compile the dictionaries:

```bash
npm install dialexjs @adonisjs/core
npm install -D @dialexjs/cli
npx dialex generate
```

## Options

The adapter takes the [locale detection options](../guide/locale-detection.md), `dictionaries` and `setHeader`. Every option, adapter by adapter, is on [Server adapters](../api/server-adapters.md).

## TypeScript

`dialex generate` writes `dialex-env.d.ts`. With it included in `tsconfig.json` (and `moduleResolution` set to `"bundler"` or `"nodenext"`), `ctx.getDictionary("home")` autocompletes the dictionary names, types the content, and `locale` is the union of your configured locales.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to `createDialexMiddleware`. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register it with `router.use`, not on a single route, so every route sees the locale and the `Content-Language` header.
- Destructure `locale` and `getDictionary` from the context in handlers; both are set for the whole request.

## Troubleshooting

- **`ctx.getDictionary is not a function`**: the middleware is not registered, or the route it belongs to is not covered by it. Add it with `router.use` in `start/kernel.ts`.
- **Type error on `ctx.locale`**: the declarations of `dialexjs/adonis` are not part of your project. Run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
