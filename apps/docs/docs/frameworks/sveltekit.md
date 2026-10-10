# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });
```

Combine it with other hooks using `sequence` from `@sveltejs/kit/hooks`.

## Locals

`dialexHandle` fills `event.locals.locale` and `event.locals.getDictionary(name)`, and augments `App.Locals` so both are typed:

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## Document language

Put the placeholder in `src/app.html`; it is replaced with the resolved locale on every response:

```html
<html lang="%dialex.lang%"></html>
```

`Content-Language` is set unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the request event.

## Best practices

- Resolve the locale on the server with `dialexHandle` and pass it to the browser from the root `+layout.server.ts`. In components, use [`dialexjs/svelte`](./svelte.md) with `initialLocale`, so the first client render matches the HTML.
- Combine `dialexHandle` with your other hooks using `sequence` from `@sveltejs/kit/hooks`, and put it first so later hooks can read `event.locals.locale`.
- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.

## Troubleshooting

- **`locals.getDictionary` is not a function**: `handle` is not exported from `src/hooks.server.ts`, or `dialexHandle` is not part of it. Export `handle = dialexHandle({ ...dialex })`.
- **`getDictionary` returns `any`**: the type registry is missing. Run `dx generate` and make sure `dialex-env.d.ts` is included by your `tsconfig`.
- **Always the default locale**: no source matched the request. The order is the URL prefix (`/tr/...`), `?locale=` or `?lang=`, the `locale` cookie, then `Accept-Language`. Check which of them the client really sends.
