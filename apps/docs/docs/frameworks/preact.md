# Preact

`dialexjs/preact` provides a context provider and hooks for Preact 10 and later. It does not need `preact/compat`, so it works in apps that use the plain Preact API.

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

Wrap the app in `DialexProvider` and spread the generated `dialex` export into it:

```tsx
// src/index.tsx
import { DialexProvider } from "dialexjs/preact";
import { render } from "preact";

import { App } from "./app";
import { dialex } from "./dialex.generated";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);
```

## Use dictionaries

`useDictionary(name)` returns the dictionary of the current locale, and `useT(...names)` returns a `t("dictionary.key", values?)` function:

```tsx
import { useDictionary, useT } from "dialexjs/preact";
import { useState } from "preact/hooks";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

Values are type-checked from the ICU message, so `count` above must be a number.

## Switch the locale

`useDialex()` returns the active `locale` and `setLocale`. The provider remembers the choice in the `locale` cookie and keeps `<html lang>` in sync:

```tsx
import { useDialex } from "dialexjs/preact";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale} onChange={(event) => setLocale(event.currentTarget.value)}>
      {locales.map((code) => (
        <option value={code}>{code.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

## Server rendering

With `preact-render-to-string` or a framework such as Fresh, pass the locale the server resolved as `initialLocale`, so the markup and the first client render agree. Use [`dialexjs/web`](./web.md) to resolve it from the request:

```tsx
import { DialexProvider } from "dialexjs/preact";
import { createDialexHandler } from "dialexjs/web";
import { renderToString } from "preact-render-to-string";

import { App } from "./app";
import { dialex } from "./dialex.generated";

const resolveDialex = createDialexHandler({ ...dialex });

export async function render(request: Request) {
  const { locale } = await resolveDialex(request);
  return renderToString(
    <DialexProvider {...dialex} initialLocale={locale}>
      <App />
    </DialexProvider>,
  );
}
```

## API

| Export                         | Description                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Provides the locale and dictionaries to the tree. Props: the generated `dictionaries`, `config`, `loaders`, plus `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` or `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Returns `{ locale, setLocale, store }`. Throws outside a `DialexProvider`                                                                                                                                                                      |
| `useDictionary(name)`          | The dictionary for the current locale, following the fallback chain. The component re-renders on locale change and when a lazy dictionary loads                                                                                                |
| `useT(...names)`               | A `t("dictionary.key", values?)` function bound to the current locale. Name the dictionaries to load them with lazy loading                                                                                                                    |
| `useDialexConfig()`            | The generated `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                           |

## Lazy loading

With `lazy: true` or `"locale"` in `dialex.config.ts`, `useDictionary` returns an empty object until the dictionary has loaded, and the component re-renders when it arrives. Preload what the next view needs with `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/preact";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Links and navigation

If your URLs carry the locale (`/tr/about`), build links with `localizePath` from [Routing Helpers](../guide/routing.md) and the locale the app is showing. Dialex has no link component for preact-iso: a few lines of your own keep `route()` and redirects working the same way, and show exactly what happens to a path. The generated `config` already holds `locales`, `defaultLocale` and `prefixDefault`, so nothing is repeated.

```tsx
import { useDialex } from "dialexjs/preact";
import { localizePath } from "dialexjs/routing";
import { useLocation } from "preact-iso";

import { config } from "./dialex.generated";

export function Nav() {
  const { locale } = useDialex();
  const { route } = useLocation();
  const localize = (path: string, to = locale) => localizePath(path, to, config);

  return (
    <>
      <a href={localize("/about")}>About</a>
      <button onClick={() => route(localize("/cart"))}>Cart</button>
    </>
  );
}
```

## Best practices

- Render `DialexProvider` once, at the root. Every component below it shares the same locale and the same loaded dictionaries.
- Pass `initialLocale` when you render on the server. Without it the server renders the default locale and the remembered one is applied after mount.
- Call hooks at the top level of the component, as with any Preact hook.
- Use `useT("home")` for text with numbers or choices, and read plain strings from `useDictionary("home")`.

## Troubleshooting

- **`useDialex must be used within a DialexProvider`**: the component is rendered outside the provider. Wrap the root in `<DialexProvider {...dialex}>`.
- **The text flashes the default language on load**: the remembered locale is applied after mount. Resolve it on the server and pass it as `initialLocale`.
- **Keys are not autocompleted**: run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`. The CLI adds the `dialexjs/preact` declarations when `preact` is in `package.json`.
