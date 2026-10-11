# Dialex + Lit

A Lit app (Vite) with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU plurals
and instant locale switching through `dialexjs/lit`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build
```

- `dialex.config.ts` sets the locales; `src/content/*.content.ts` hold the dictionaries.
- `src/i18n.ts` creates the shared locale state with `createDialex({ ...dialex })`.
- Elements add `new DialexController(this, i18n)`, then read `dictionary("home")` or `t("home")` in
  `render()`. They render again when the locale changes.
- `src/language-switcher.ts` changes the locale with `setLocale`.
