# Dialex + AdonisJS

An AdonisJS 6 app (slim starter) with [Dialex](https://github.com/awaiden/dialex): a middleware that
puts the locale and typed dictionaries on every request through `dialexjs/adonis`.

```bash
cp .env.example .env
bun run dev      # generates start/dialex.generated.ts, then starts the server on :3333
bun run build    # generates and type-checks
```

- `dialex.config.ts` sets the locales and writes the generated file to `start/`.
- `app/home.content.ts` holds the dictionary.
- `app/middleware/dialex_middleware.ts` builds the middleware with `createDialexMiddleware`, and
  `start/kernel.ts` registers it with `router.use`.
- `start/routes.ts` reads `ctx.locale` and `ctx.getDictionary("home")`.

Try it: `curl -H 'Accept-Language: tr' localhost:3333` and `curl localhost:3333/tr/greet/Ahmet`.
