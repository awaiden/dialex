# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
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

## Install

Install the framework package you already use together with Dialex, then compile the dictionaries:

```bash
npm install dialexjs astro
npm install -D @dialexjs/cli
npx dialex generate
```

## Options

The adapter takes the [locale detection options](../guide/locale-detection.md), `dictionaries` and `setHeader`. Every option, adapter by adapter, is on [Server adapters](../api/server-adapters.md).

## TypeScript

`dialex generate` writes `dialex-env.d.ts`. With it included in `tsconfig.json` (and `moduleResolution` set to `"bundler"` or `"nodenext"`), `Astro.locals.getDictionary("home")` autocompletes the dictionary names, types the content, and `locale` is the union of your configured locales.

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Keep the middleware in `src/middleware.ts` and read the locale from `Astro.locals` in pages, layouts and endpoints; do not resolve it again per page.
- Set `<html lang={Astro.locals.locale}>` in your layout, and add `hreflang` links with the [routing helpers](../guide/routing.md) for pages that exist in several languages.

## Troubleshooting

- **`Astro.locals.getDictionary` is not a function**: Astro only loads `src/middleware.ts` (or `src/middleware/index.ts`). Export `onRequest` from there.
- **Static pages are always in one language**: with prerendering there is no request. Render per-language routes (`/en/...`, `/tr/...`) or use server output.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
