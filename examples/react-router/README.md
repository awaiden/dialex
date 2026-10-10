# Dialex + React Router

A React Router 8 (framework mode, SSR) app with [Dialex](https://github.com/awaiden/dialex). The
server decides the locale of each request, so the HTML is rendered in the right language.

```bash
bun run dev        # generates dialex.generated.ts, then starts the dev server
bun run build      # builds the client and the server
bun run start      # serves the build
bun run typecheck
```

- `app/dialex.server.ts` creates the request handler with `createDialexHandler({ ...dialex })`
  from `dialexjs/web`. It reads `?lang=`, the `locale` cookie and `Accept-Language`.
- `app/root.tsx`: the loader returns the locale, `<html lang>` follows it, and
  `<DialexProvider {...dialex} initialLocale={locale}>` renders the app in that locale.
- `app/components/LanguageSwitcher.tsx` changes the locale; the provider remembers it in the
  `locale` cookie, and the loader revalidates.
- `app/routes/*` read dictionaries with `useDictionary` and ICU messages with `useT`; the home
  route also uses a dictionary on the server, in its loader.

Try it: `curl -H 'Accept-Language: tr' http://localhost:3000/` or open `/?lang=tr`.
