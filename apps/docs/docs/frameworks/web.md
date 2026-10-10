# Fetch API (Request)

`dialexjs/web` resolves the locale from a standard `Request`. Use it in any framework or runtime that hands you one: React Router and Remix loaders, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated.js";

export const resolveDialex = createDialexHandler({ ...dialex });

const { locale, getDictionary, t, headers, applyHeaders } = await resolveDialex(request);
```

| Result                   | Description                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `locale`                 | The detected locale                                                                                               |
| `getDictionary(name)`    | Dictionary content for that locale, following [fallbacks](../guide/fallbacks.md)                                  |
| `t(path, ...args)`       | [Key-path translator](../guide/key-paths.md)                                                                      |
| `headers`                | `{ "Content-Language": locale }` (empty when `setHeader` is `false`)                                              |
| `applyHeaders(response)` | Returns the response with those headers; copies it if its headers are immutable (for example `Response.redirect`) |

Detection order and options are the same as for the other adapters: see [Locale Detection](../guide/locale-detection.md).

## Recipes

These show how the pieces fit together. Only `dialexjs/web` itself is covered by Dialex's tests; the framework wiring below has not been run against real apps, so check it against your framework's current docs.

### React Router / Remix

Loaders receive the `Request`:

```ts
export async function loader({ request }: { request: Request }) {
  const { locale, getDictionary } = await resolveDialex(request);
  return { locale, title: getDictionary("home").title };
}
```

Return the data to your component and render it there. Wrap the response with `applyHeaders` if you build one yourself.

### TanStack Start and SolidStart

Read the current request with your framework's server helper, then pass it to `resolveDialex`. For example, in SolidStart, `getRequestEvent()?.request` returns the active `Request`. Because the call needs a server context, use it in server functions or middleware, not in client code. In TanStack Start, call `getRequest()` from `@tanstack/react-start/server` inside a `createServerFn` handler. The [`examples/tanstack`](https://github.com/awaiden/dialex/tree/main/examples/tanstack) app does this in the root route's `beforeLoad` and passes the result to `DialexProvider` as `initialLocale`; unlike the other recipes here, it runs in a real app.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const dialex = await resolveDialex(request);
    return dialex.applyHeaders(new Response(dialex.getDictionary("home").title));
  },
};
```

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to the adapter. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Create the handler once at module level and call it for every request; creating it per request repeats the setup work.
- Return responses through `applyHeaders` so `Content-Language` is set, including for redirects. React Router has its own [guide](./react-router.md) built on this handler.

## Troubleshooting

- **The locale is always the default in a worker**: the `Request` you pass does not carry the original headers. Pass the incoming request, not a rebuilt one.
- **`Cannot modify immutable headers`**: the response came from `fetch()` or `Response.redirect()`. `applyHeaders` copies such responses, so use its return value.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
