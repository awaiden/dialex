# Dialex + Svelte

A Svelte 5 app (Vite) with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU
plurals and instant locale switching through `dialexjs/svelte`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build
bun run check    # svelte-check and type-check
```

- `dialex.config.ts` sets the locales; `src/content/*.content.ts` hold the dictionaries.
- `src/App.svelte` calls `provideDialex({ ...dialex })` once; `useDictionary("home")` returns a
  store (`$home.title`) and `useT("home")` a store with the translate function (`$t("home.cart.items", { count })`).
- `src/lib/LanguageSwitcher.svelte` changes the locale with `setLocale`.

`dialexjs/svelte` uses `svelte/store` and Svelte's context, so it works in Svelte 4 and 5 without
runes or a compile step. SvelteKit apps combine it with `dialexjs/sveltekit` for server rendering.
