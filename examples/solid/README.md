# Dialex + Solid

A SolidJS app (Vite) with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU
plurals and instant locale switching through `dialexjs/solid`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build
```

- `dialex.config.ts` sets the locales; `src/content/*.content.ts` hold the dictionaries.
- `src/index.tsx` wraps the app in `<DialexProvider {...dialex}>`.
- `useDictionary("home")` returns an accessor, so JSX reads `home().title` and updates when the
  locale changes; `useT("home")` returns a translate function you call in JSX.
- `src/components/LanguageSwitcher.tsx` changes the locale with `setLocale`.
