# React / Vite

## Setup

There is no bundler plugin. `dx generate` writes `src/dialex.generated.ts`, which exports `dialex`: your dictionaries and a client-safe copy of your config. Spread it into the provider:

```tsx
import { DialexProvider } from "dialexjs/react";
// src/main.tsx
import { createRoot } from "react-dom/client";

import App from "./App";
import { dialex } from "./dialex.generated";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);
```

Keep the file current with `dx generate --watch` in a second terminal, or install the VS Code extension, which regenerates it on save. `dx check` fails when the file is out of date, so a forgotten run is caught in CI. Because nothing plugs into the bundler, server-side rendering (for example TanStack Start or React Router in Vite) works without extra Vite configuration.

## Provider and hooks

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";

import { dialex } from "./dialex.generated";

function App() {
  const { locale, setLocale } = useDialex();
  const dict = useDictionary("home");

  return (
    <div>
      <h1>{dict.title}</h1>
      <button onClick={() => setLocale(locale === "en" ? "tr" : "en")}>
        Switch Locale ({locale})
      </button>
    </div>
  );
}

export default () => (
  <DialexProvider {...dialex} defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| Export                | Description                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DialexProvider`      | Holds the active locale and the dictionaries. Props: `children`, the generated `dialex` (`dictionaries`, `config`, `loaders`), and `defaultLocale` (falls back to the config, then `"en"`) |
| `useDialex()`         | Returns `{ locale, setLocale }`. Throws outside the provider                                                                                                                               |
| `useDictionary(name)` | Returns the dictionary for the current locale, falling back to the default locale                                                                                                          |

## Provider props

| Prop            | Default             | Description                                                                                                                                        |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | config, then `"en"` | Locale used when nothing else decides                                                                                                              |
| `initialLocale` |                     | The locale to render first. Pass the locale the server rendered with so hydration matches. When set, the remembered locale is not applied on mount |
| `persist`       | `"cookie"`          | Where the choice is remembered: `"cookie"`, `"localStorage"` or `false`                                                                            |
| `storageKey`    | `"locale"`          | Cookie or localStorage key                                                                                                                         |
| `dictionaries`  |                     | The dictionaries from `dialex.generated.ts` (spread `{...dialex}`)                                                                                 |
| `config`        |                     | The client-safe config from the same file: `locales`, `defaultLocale`, `fallbacks`, `prefixDefault`, `lazy`                                        |
| `loaders`       |                     | Present in [lazy mode](../guide/lazy-loading.md): loads each dictionary the first time it is used                                                  |

The provider renders the default locale first, then applies the remembered locale after mount (only if it is one of the configured `locales`). This keeps the first client render identical to server-rendered markup, at the cost of one extra render for returning visitors. To avoid it, read the cookie on the server and pass it as `initialLocale`. `<html lang>` is kept in sync with the active locale.

`useT(...dictionaryNames)` returns a [`t` function](../guide/key-paths.md). With [lazy loading](../guide/lazy-loading.md), `useDictionary` suspends until its dictionary has loaded.

## Best practices

- Render one `DialexProvider` at the root. Nested providers start independent locales, which is rarely what you want.
- With server rendering (Next.js client components, React Router, TanStack Start), pass `initialLocale` from the request. Without it the provider shows the default locale first and applies the remembered one after mount.
- With lazy loading, wrap the part of the tree that reads dictionaries in `<Suspense>`: `useDictionary` suspends until its dictionary has arrived, and `setLocale` uses a transition so the old language stays visible meanwhile.

## Troubleshooting

- **`useDialex must be used within a DialexProvider`**: the component is rendered outside the provider, for example in a portal root or a test. Wrap it, or use the [testing wrapper](../guide/testing.md).
- **A hydration warning about text**: the server rendered one locale and the client's first render used another. Pass the server's locale as `initialLocale`.
- **`getDictionary` returns `any`**: the type registry is missing. Run `dx generate` and make sure `dialex-env.d.ts` is included by your `tsconfig`.
