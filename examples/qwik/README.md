# Dialex + Qwik

A Qwik app (Vite, client-side rendering) with [Dialex](https://github.com/awaiden/dialex): typed
dictionaries, ICU plurals and instant locale switching through `dialexjs/qwik`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build
```

- `dialex.config.ts` sets the locales; `src/content/*.content.ts` hold the dictionaries.
- `src/i18n.ts` binds the hooks once with `createDialexQwik({ ...dialex })`. The dictionaries stay
  in that module; only the active locale is component state, so Qwik can serialize it.
- `src/root.tsx` calls `useDialexProvider()` and reads `useDictionary("home")` and `useT()`.
- `src/components/language-switcher.tsx` changes the locale with `setLocale(state, locale)`.
