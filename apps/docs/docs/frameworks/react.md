# React / Vite

## Vite plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { i18nPlugin } from "dialex/vite";

export default defineConfig({
  plugins: [react(), i18nPlugin()],
});
```

`i18nPlugin(inlineConfig?)` loads your config, regenerates `src/dialex-env.d.ts`, and serves two virtual modules, `virtual:dialex-dictionaries` and `virtual:dialex-config`, with HMR when a `.content.ts` file changes. If `locales` is set, a dictionary missing one of them fails the build.

## Provider and hooks

```tsx
import { I18nProvider, useI18n, useDictionary } from "dialex/react";

function App() {
  const { locale, setLocale } = useI18n();
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
  <I18nProvider defaultLocale="en">
    <App />
  </I18nProvider>
);
```

| Export                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nProvider`        | Holds the active locale. Props: `children`, `defaultLocale` (falls back to the config, then `"en"`) |
| `useI18n()`           | Returns `{ locale, setLocale }`. Throws outside the provider                                        |
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
