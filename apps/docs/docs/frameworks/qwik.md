# Qwik

`dialexjs/qwik` binds Qwik hooks to your dictionaries. Qwik serializes component state into the HTML and resumes on the client, and dictionaries contain functions that cannot be serialized, so they stay in a module of their own. Only the active locale, a string, travels in the page.

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

Bind the hooks once, in a module, and import them from there:

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

Call `useDialexProvider()` in the root layout:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

import { useDialexProvider } from "../i18n";

export default component$(() => {
  useDialexProvider();
  return <Slot />;
});
```

## Use dictionaries

`useDictionary(name)` returns an accessor for the dictionary of the current locale, so JSX reads `home().title`, and `useT()` returns a `t("dictionary.key", values?)` function. Components that read them render again when the locale changes:

```tsx
import { component$ } from "@builder.io/qwik";

import { useDictionary, useT } from "../i18n";

export default component$(() => {
  const home = useDictionary("home");
  const t = useT();

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: 2 })}</p>
    </>
  );
});
```

Values are type-checked from the ICU message, so `count` above must be a number.

## Switch the locale

`useDialex()` returns the state of the provider, and `setLocale(state, locale)` changes it. `setLocale` is a plain function, so an `onClick$` can use it without capturing anything that cannot be serialized:

```tsx
import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();

  return (
    <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
});
```

`setLocale` remembers the choice in the `locale` cookie and keeps `<html lang>` in sync.

## Resolve the locale on the server

Resolve the locale from the request with [`dialexjs/web`](./web.md) in a `routeLoader$`, and give it to the provider. The first render on the server and the resumed client then agree:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";
import { useDialexProvider } from "../i18n";

const resolveDialex = createDialexHandler({ ...dialex });

export const useLocale = routeLoader$(async ({ request }) => {
  const { locale } = await resolveDialex(request);
  return locale;
});

export default component$(() => {
  const locale = useLocale();
  useDialexProvider({ initialLocale: locale.value });
  return <Slot />;
});
```

## API

`createDialexQwik({ ...dialex })` accepts the generated `dictionaries`, `config` and `loaders`, plus `persist` (`"cookie"`, `"localStorage"` or `false`) and `storageKey`. It returns:

| Export                                 | Description                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `useDialexProvider({ initialLocale })` | Provides the locale to the components below. Call it once, in the root layout                                      |
| `useDialex()`                          | Returns the provider state, `{ locale }`. Read `locale`; change it with `setLocale`                                |
| `setLocale(state, locale)`             | Changes the locale, remembers it and keeps `<html lang>` in sync                                                   |
| `getPersistedLocale()`                 | The locale remembered in this browser, when the app supports it. `undefined` on the server                         |
| `useDictionary(name)`                  | An accessor for the dictionary of the current locale, following the fallback chain. Call it in JSX: `home().title` |
| `useT()`                               | A `t("dictionary.key", values?)` function bound to the current locale                                              |

## Best practices

- Create the hooks with `createDialexQwik` in one module and import from it. Do not call `createDialexQwik` inside a component, because the dictionaries must not be part of the component state.
- Read `useDialex().locale` in the component that needs it, not in the layout, so only that component renders again on a change.
- Pass `initialLocale` from a `routeLoader$` for server-rendered pages, so a visitor with a remembered locale does not see a flash of the default language.
- With lazy loading, `await preloadDictionaries(dialex, "home")` in a `routeLoader$` so the server render already has the text. In the browser, components render again when a load finishes.
- Call the accessor in JSX (`home().title`) rather than copying `home()` into a variable once. Qwik does not refresh plain property reads of a copied object when the locale changes.

## Troubleshooting

- **The hooks cannot find the provider**: the component is rendered outside it. Call `useDialexProvider()` in a layout above the component.
- **Qwik reports a value that cannot be serialized**: a dictionary or the result of `useT()` was captured by a `$` closure, for example an `onClick$`. Read the text you need while the component renders, and pass only plain values into the closure.
- **Keys are not autocompleted**: run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`. The CLI adds the `dialexjs/qwik` declarations when `@builder.io/qwik` is in `package.json`.
