# Fetch API (Request)

`dialexjs/web` resolves the locale from a standard `Request`. Use it in any framework or runtime that hands you one: React Router and Remix loaders, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createI18nHandler } from "dialexjs/web";
import dictionaries from "./dialex.generated.js";

export const resolveI18n = createI18nHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveI18n(request);
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
  const { locale, getDictionary } = await resolveI18n(request);
  return { locale, title: getDictionary("home").title };
}
```

Return the data to your component and render it there. Wrap the response with `applyHeaders` if you build one yourself.

### TanStack Start and SolidStart

Read the current request with your framework's server helper, then pass it to `resolveI18n`. For example, in SolidStart, `getRequestEvent()?.request` returns the active `Request`. Because the call needs a server context, use it in server functions or middleware, not in client code.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const i18n = await resolveI18n(request);
    return i18n.applyHeaders(new Response(i18n.getDictionary("home").title));
  },
};
```
