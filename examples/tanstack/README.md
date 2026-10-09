# Dialex + TanStack Start

A TanStack Start (React, SSR) app with Dialex, created with `create-vite` → React → TanStack Router
(which runs `@tanstack/cli create`).

- `vite.config.ts` adds `dialexPlugin()` next to `tanstackStart()`. Nothing else is needed for SSR.
- `src/server/locale.ts` is a server function that detects the locale from the request with
  `dialexjs/web` (path, `?lang=`, `locale` cookie, `Accept-Language`).
- `src/routes/__root.tsx` calls it in `beforeLoad` and passes the result to
  `DialexProvider initialLocale={locale}`, so the server and the client render the same language.
- Dictionaries live in `src/content/*.content.ts`; `dx generate` writes `src/dialex.generated.ts`.

```bash
bun install
bun run dev      # http://localhost:3000
bun run build
```

Try `curl -H "Accept-Language: tr" http://localhost:3000/` or the language buttons in the header.
