---
"dialexjs": minor
"@dialexjs/cli": minor
---

Two new framework entry points and CLI support for four more frameworks.

- `dialexjs/svelte`: Svelte 4 and 5 (plain Vite apps, and SvelteKit components). `provideDialex({ ...dialex })` in the root component, then `useDictionary("home")` and `useT("home")` return stores (`$home.title`, `$t("home.cart.items", { count })`). It uses `svelte/store` and Svelte's context, so no runes or compile step are needed.
- `dialexjs/solid`: SolidJS. `<DialexProvider {...dialex}>` and `useDictionary("home")` returning an accessor (`home().title`), `useT`, `useDialex`.
- `dialex init` and the type registry detect Svelte, Solid and React Router (framework mode), and `dialex-env.d.ts` augments `dialexjs/svelte` and `dialexjs/solid`.
- New config option `output`: where `dialex generate` writes `dialex.generated.ts` (the type declarations go next to it). React Router apps keep their source in `app/`.
- New examples: `examples/vue`, `examples/svelte`, `examples/solid` and `examples/react-router`.

Documentation: new pages for Svelte, Solid and React Router, a Best practices guide, and Best practices and Troubleshooting sections on every framework page, in five languages.
