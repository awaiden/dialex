# Hapi

```ts
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });

await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/{locale}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return { title: dict.title, locale: request.locale };
  },
});

await server.start();
```

Register `dialexPlugin` before your routes. It adds `request.locale` and `request.getDictionary(name)` to every request and sets the `Content-Language` response header, on error responses too. All [locale detection options](../guide/locale-detection.md#options) apply.

## Install

Install the framework package you already use together with Dialex, then compile the dictionaries:

```bash
npm install dialexjs @hapi/hapi
npm install -D @dialexjs/cli
npx dialex generate
```

## Options

The adapter takes the [locale detection options](../guide/locale-detection.md), `dictionaries` and `setHeader`. Every option, adapter by adapter, is on [Server adapters](../api/server-adapters.md).

## TypeScript

`dialex generate` writes `dialex-env.d.ts`. With it included in `tsconfig.json` (and `moduleResolution` set to `"bundler"` or `"nodenext"`), `request.getDictionary("home")` autocompletes the dictionary names, types the content, and `locale` is the union of your configured locales.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` as the plugin options. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Register the plugin before the routes that read the locale. The locale is resolved in the `onRequest` extension point, so it is available in every later step of the lifecycle, including authentication and validation.
- Use `request.locale` to pick the language of any text you send, including `Boom` error messages, so they match the rest of the page.

## Troubleshooting

- **`request.getDictionary is not a function`**: the plugin is not registered on the server that owns the route. Register it on the root server, or on the plugin that defines the route.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
