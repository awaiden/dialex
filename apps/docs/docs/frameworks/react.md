# React / Vite

## Vite plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
```

`dialexPlugin(inlineConfig?)` loads your config, regenerates `src/dialex-env.d.ts`, and serves two virtual modules, `virtual:dialex-dictionaries` and `virtual:dialex-config`, with HMR when a `.content.ts` file changes. If `locales` is set, a dictionary missing one of them fails the build.

The plugin also sets `ssr.noExternal` and `optimizeDeps.exclude` for `dialexjs` itself, so server-side rendering (for example TanStack Start or React Router in Vite) works without extra Vite configuration. `include` is a plain glob relative to the project root, the same one the CLI uses; a leading `/` is accepted.

## Provider and hooks

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";

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
  <DialexProvider defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| Export                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Holds the active locale. Props: `children`, `defaultLocale` (falls back to the config, then `"en"`) |
| `useDialex()`         | Returns `{ locale, setLocale }`. Throws outside the provider                                        |
| `useDictionary(name)` | Returns the dictionary for the current locale, falling back to the default locale                   |

## Provider props

| Prop            | Default             | Description                                                                                                                                        |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | config, then `"en"` | Locale used when nothing else decides                                                                                                              |
| `initialLocale` |                     | The locale to render first. Pass the locale the server rendered with so hydration matches. When set, the remembered locale is not applied on mount |
| `persist`       | `"cookie"`          | Where the choice is remembered: `"cookie"`, `"localStorage"` or `false`                                                                            |
| `storageKey`    | `"locale"`          | Cookie or localStorage key                                                                                                                         |

The provider renders the default locale first, then applies the remembered locale after mount (only if it is one of the configured `locales`). This keeps the first client render identical to server-rendered markup, at the cost of one extra render for returning visitors. To avoid it, read the cookie on the server and pass it as `initialLocale`. `<html lang>` is kept in sync with the active locale.

`useT(...dictionaryNames)` returns a [`t` function](../guide/key-paths.md). With [lazy loading](../guide/lazy-loading.md), `useDictionary` suspends until its dictionary has loaded.
