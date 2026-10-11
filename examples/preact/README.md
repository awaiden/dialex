# Dialex + Preact

A Preact app (Vite) with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU
plurals and instant locale switching through `dialexjs/preact`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build
```

- `dialex.config.ts` sets the locales; `src/content/*.content.ts` hold the dictionaries.
- `src/index.tsx` wraps the app in `<DialexProvider {...dialex}>`.
- `useDictionary("home")` returns the dictionary for the current locale, and `useT("home")` returns
  a translate function for ICU messages.
- `src/components/LanguageSwitcher.tsx` changes the locale with `setLocale`.
