# tRPC

`dialexjs/trpc` puts the locale and the dictionaries into the tRPC context, so every procedure can translate its own errors and messages. It has no dependency on `@trpc/server`; it reads the request your adapter already gives to `createContext`.

```ts
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { title: dict.title, locale: ctx.locale };
  }),
});
```

`resolveDialex(request)` returns `{ locale, getDictionary, t }`. Spread it into your own context next to the session or database handle.

## Request shapes

The argument can be a Fetch `Request`, which the fetch, Next.js and Cloudflare adapters pass, or any object with `headers` and an optional `url`, which is what the Express and standalone adapters pass:

```ts
// Express adapter
createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ ...resolveDialex(req) }),
});
```

## Best practices

- Pass `{ ...dialex }` from `dialex.generated.ts` to `createDialexContext`. It carries the dictionaries and the locale config, so `defaultLocale`, `locales` and `fallbacks` are written once, in `dialex.config.ts`.
- Create `resolveDialex` once, at module level, and call it per request inside `createContext`.
- Use `ctx.getDictionary("errors")` to build the message of a `TRPCError`, so clients receive text in their own language.
- tRPC calls often come from your own frontend. Send the locale as the `locale` cookie or the `Accept-Language` header, which the browser does by itself, rather than as an input of every procedure.

## Troubleshooting

- **The locale is always the default**: with the Express adapter `req.url` is relative to the mount path, so a locale prefix in the path is not seen. Use the cookie or `Accept-Language` instead, or pass the original URL in `url`.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
- **`ctx.getDictionary` is missing in a procedure**: `createContext` does not return the result of `resolveDialex`. Spread it into the object you return.
