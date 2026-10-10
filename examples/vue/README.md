# Dialex + Vue

A Vue 3 app with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU plurals and
instant locale switching through `dialexjs/vue`.

```bash
bun run dev      # generates dialex.generated.ts, then starts Vite
bun run build    # type-checks and builds
```

- `dialex.config.ts` sets the locales.
- `src/content/*.content.ts` hold the dictionaries; `dx generate` compiles them into
  `src/dialex.generated.ts`.
- `src/main.ts` installs the plugin with `createDialex({ ...dialex })`.
- `src/App.vue` reads dictionaries with `useDictionary` and ICU messages with `useT`.
