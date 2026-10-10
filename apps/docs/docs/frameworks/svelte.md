# Svelte

`dialexjs/svelte` gives Svelte 4 and 5 components a locale store and dictionaries as stores. It works in plain Vite apps and in SvelteKit components. It uses `svelte/store` and Svelte's context, so there are no runes or compile steps to set up. For locale detection on the server in SvelteKit, see [SvelteKit](./sveltekit.md).

## Install

Install the runtime and the CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Set up

Create `dialex.config.ts` with your locales (or run `dialex init`, which also adds the packages and a starter dictionary):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Write a dictionary next to the code that uses it. Every locale has the same keys:

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    greeting: (name: string) => `Hello, ${name}!`,
    items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    greeting: (name: string) => `Merhaba, ${name}!`,
    items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}",
  },
});
```

Compile the dictionaries into `dialex.generated.ts` and the type declarations. Run it again when a dictionary changes, or keep `dx generate --watch` running:

```bash
npx dx generate
```

Call `provideDialex` once, in the script of your root component, with the generated `dialex` export:

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "./dialex.generated";
  import Home from "./lib/Home.svelte";

  provideDialex({ ...dialex });
</script>

<Home />
```

## Use dictionaries

`useDictionary(name)` returns a store with the dictionary of the current locale. Prefix it with `$` in the template. Keys are typed and autocompleted from your dictionaries:

```svelte
<!-- src/lib/Home.svelte -->
<script lang="ts">
  import { useDictionary } from "dialexjs/svelte";

  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<p>{$home.greeting("Alex")}</p>
```

## ICU messages and plurals

`useT(...names)` returns a store with a `t` function. Call it as `$t("home.items", { count })`; `count` is type-checked from the message. With [lazy loading](../guide/lazy-loading.md), name the dictionaries you read so they load:

```svelte
<script lang="ts">
  import { useT } from "dialexjs/svelte";

  const t = useT("home");
  let count = $state(2);
</script>

<p>{$t("home.items", { count })}</p>
<button onclick={() => count++}>+1</button>
```

## Switch the locale

`useDialex()` returns the `locale` store and `setLocale`. The provider remembers the choice in the `locale` cookie, updates `<html lang>`, and every `$` store follows:

```svelte
<script lang="ts">
  import { useDialex } from "dialexjs/svelte";

  import { locales } from "../dialex.generated";

  const { locale, setLocale } = useDialex();
</script>

<select value={$locale} onchange={(event) => setLocale(event.currentTarget.value)}>
  {#each locales as code (code)}
    <option value={code}>{code.toUpperCase()}</option>
  {/each}
</select>
```

## API

| Export                                 | Description                                                                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(source, options?)`      | Makes Dialex available to the component and everything below it. Call it once in the root component. Options: `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` or `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                          | Returns `{ locale, setLocale, store }`. `locale` is a readable store. Throws outside a component under `provideDialex`                                                                                                                      |
| `useDictionary(name)`                  | A readable store with the dictionary for the current locale, following the fallback chain                                                                                                                                                   |
| `useT(...names)`                       | A readable store with `t("dictionary.key", values?)` for the current locale                                                                                                                                                                 |
| `createSvelteDialex(source, options?)` | The reactive core without Svelte's context, for plain modules and tests. Returns `{ locale, setLocale, store, dictionary(name), translator(...names) }`                                                                                     |

## Server rendering and SvelteKit

In SvelteKit, resolve the locale in `hooks.server.ts` with [`dialexHandle`](./sveltekit.md), return it from the root `+layout.server.ts`, and pass it as `initialLocale`, so the server and the first client render agree:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "../dialex.generated";

  let { data, children } = $props();

  provideDialex({ ...dialex }, { initialLocale: data.locale });
</script>

{@render children()}
```

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => ({ locale: locals.locale });
```

## Lazy loading

With `lazy: true` or `"locale"` in `dialex.config.ts`, `useDictionary` returns an empty object until the dictionary has arrived and then updates the store. Preload what the next page needs:

```ts
import { preloadDictionaries } from "dialexjs/svelte";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Testing

Test the reactive core without rendering a component. `createSvelteDialex` takes the same `dialex` export and returns stores you can read with `get`:

```ts
import { createSvelteDialex } from "dialexjs/svelte";
import { get } from "svelte/store";
import { expect, it } from "vitest";

import { dialex } from "./dialex.generated";

it("switches to Turkish", () => {
  const app = createSvelteDialex({ ...dialex }, { persist: false });
  const home = app.dictionary("home");

  expect(get(home).title).toBe("One dictionary, every language");
  app.setLocale("tr");
  expect(get(home).title).toBe("Tek sözlük, her dil");
});
```

## Best practices

- Call `provideDialex` in the root component only. Components below use `useDictionary` and `useT`; a second `provideDialex` starts a separate locale.
- Call `useDictionary` and `useT` at the top level of a component's script, because they use Svelte's context. Do not call them inside event handlers or after an `await`.
- Read a dictionary into a store once and use `$name.key` in the template. Avoid calling `useDictionary` for the same name in many small components when one parent can pass the text down.
- Pass `initialLocale` whenever the server decides the locale. Without it the provider shows the default locale first and applies the remembered one after mount.

## Troubleshooting

- **`useDialex requires provideDialex() in a parent component`**: `provideDialex` was not called in an ancestor, or it runs after the component that uses the stores. Call it in the root component's script.
- **Keys are not autocompleted**: run `dx generate` and make sure `dialex-env.d.ts` is included by your `tsconfig`. The CLI adds the `dialexjs/svelte` declarations when `svelte` is in `package.json`.
- **The language flashes on load**: the server rendered one locale and the client started with another. Pass the server's locale as `initialLocale`.
