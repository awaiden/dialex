# Solid

`dialexjs/solid` provides a context provider and fine-grained accessors for SolidJS. A dictionary is an accessor, so JSX reads `home().title` and only the text nodes that use it update when the locale changes.

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
import { DialexProvider } from "dialexjs/solid";
import { render } from "solid-js/web";

import App from "./App";
import { dialex } from "./dialex.generated";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);
```

## Use dictionaries

`useDictionary(name)` returns an accessor. Call it in JSX or inside an effect so the read is tracked:

```tsx
import { useDictionary, useT } from "dialexjs/solid";
import { createSignal } from "solid-js";

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = createSignal(2);

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: count() })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

`useT(...names)` returns a `t("dictionary.key", values?)` function. Values are type-checked from the ICU message, so `count` above must be a number.

## Switch the locale

`useDialex()` returns the `locale` accessor and `setLocale`. The provider remembers the choice in the `locale` cookie and keeps `<html lang>` in sync:

```tsx
import { useDialex } from "dialexjs/solid";
import { For } from "solid-js";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale()} onChange={(event) => setLocale(event.currentTarget.value)}>
      <For each={locales}>{(code) => <option value={code}>{code.toUpperCase()}</option>}</For>
    </select>
  );
}
```

## API

| Export                         | Description                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Provides the locale and dictionaries to the tree. Props: the generated `dictionaries`, `config`, `loaders`, plus `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` or `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Returns `{ locale, setLocale, store }`. `locale` is an accessor. Throws outside a `DialexProvider`                                                                                                                                             |
| `useDictionary(name)`          | An accessor of the dictionary for the current locale, following the fallback chain. Updates on locale change and when a lazy dictionary loads                                                                                                  |
| `useT(...names)`               | A `t("dictionary.key", values?)` function that follows the current locale. Name the dictionaries to load them with lazy loading                                                                                                                |

## Lazy loading

With `lazy: true` or `"locale"` in `dialex.config.ts`, `useDictionary` is empty until the dictionary has loaded and then updates the accessor. Preload what the next view needs with `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Best practices

- Read the accessor where you use it (`{home().title}`), not once at the top of the component into a plain variable. A value copied out of the accessor does not update when the locale changes.
- Call `useDictionary` and `useT` while the component is created (at its top level), because they read Solid's context. Do not call them in event handlers.
- Use `<For>` and `<Show>` for lists and conditions, with text from the dictionary inside them; Dialex strings are plain values and work with every Solid control flow component.
- Keep ICU messages for text with numbers or choices, and pass reactive values (`count()`) so the message re-renders when they change.

## Troubleshooting

- **`useDialex must be used within a DialexProvider`**: the component is rendered outside the provider. Wrap the root in `<DialexProvider {...dialex}>`.
- **The text does not change when the locale changes**: the accessor was read once outside JSX or an effect. Call `home()` where the text is rendered.
- **Keys are not autocompleted**: run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`. The CLI adds the `dialexjs/solid` declarations when `solid-js` is in `package.json`.
