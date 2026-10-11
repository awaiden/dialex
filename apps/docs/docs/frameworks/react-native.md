# React Native

`dialexjs/react-native` is the provider for React Native and Expo apps. A native app has no cookies, no `localStorage` and no URL, so the provider takes the device's languages and a storage you already use, and the hooks are the same ones as in [React](./react.md).

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

Wrap the app in `DialexProvider`. With Expo, read the device's languages from `expo-localization`, and remember the user's choice with AsyncStorage:

```tsx
// App.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DialexProvider } from "dialexjs/react-native";
import { getLocales } from "expo-localization";

import { dialex } from "./src/dialex.generated";
import { Home } from "./src/Home";

export default function App() {
  return (
    <DialexProvider
      {...dialex}
      deviceLocales={getLocales().map((locale) => locale.languageTag)}
      storage={AsyncStorage}
    >
      <Home />
    </DialexProvider>
  );
}
```

The provider picks the first device language that the app supports, then applies the locale remembered in `storage` as soon as it has been read, and writes every later change back.

## Use dictionaries

`useDictionary(name)` and `useT(...names)` work as in React:

```tsx
import { useDictionary, useT } from "dialexjs/react-native";
import { useState } from "react";
import { Button, Text, View } from "react-native";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <View>
      <Text>{home.title}</Text>
      <Text>{home.greeting("Alex")}</Text>
      <Text>{t("home.items", { count })}</Text>
      <Button title="+1" onPress={() => setCount((n) => n + 1)} />
    </View>
  );
}
```

Values are type-checked from the ICU message, so `count` above must be a number.

## Switch the locale

`useDialex()` returns the active `locale` and `setLocale`:

```tsx
import { useDialex } from "dialexjs/react-native";
import { Button, View } from "react-native";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <View>
      {locales.map((code) => (
        <Button
          key={code}
          title={code.toUpperCase()}
          disabled={code === locale}
          onPress={() => setLocale(code)}
        />
      ))}
    </View>
  );
}
```

## Storage

`storage` is anything with `getItem(key)` and `setItem(key, value)`, synchronous or returning a promise. AsyncStorage fits, and so does a small wrapper around MMKV or `expo-secure-store`:

```ts
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const storage = {
  getItem: (key: string) => mmkv.getString(key),
  setItem: (key: string, value: string) => mmkv.set(key, value),
};
```

## API

| Export                         | Description                                                                                                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Provides the locale and dictionaries to the tree. Props: the generated `dictionaries`, `config`, `loaders`, plus `deviceLocales` (a string or an array, most preferred first), `storage`, `storageKey` (default `"locale"`), `defaultLocale`, `initialLocale`, `onLocaleChange(locale)` |
| `useDialex()`                  | Returns `{ locale, setLocale, store }`. Throws outside a `DialexProvider`                                                                                                                                                                                                               |
| `useDictionary(name)`          | The dictionary for the current locale, following the fallback chain. With lazy loading it suspends until the dictionary has loaded                                                                                                                                                      |
| `useT(...names)`               | A `t("dictionary.key", values?)` function bound to the current locale. Name the dictionaries to load them with lazy loading                                                                                                                                                             |
| `useDialexConfig()`            | The generated `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                                                                    |

## Best practices

- Keep one `DialexProvider` at the root, above navigation, so every screen shares the locale.
- Pass `deviceLocales` so a first launch opens in the language of the device. The stored choice wins after that.
- With `storage`, nothing renders until the stored locale has been read, so the first screen is already in the right language. Keep the splash screen up until then.
- Pass `initialLocale` only when you decide the locale yourself, for example from an account setting. It wins over the device and the storage.
- The device language only matters until the user chooses. Show the choice in a settings screen, and call `setLocale` from there.

## Troubleshooting

- **`useDialex must be used within a DialexProvider`**: the component is rendered outside the provider. Wrap the root component in `<DialexProvider {...dialex}>`.
- **The app opens in the default language**: no entry of `deviceLocales` matches a configured locale, or `deviceLocales` was not passed. `en-US` matches `en`, but `pt-BR` does not match `en`.
- **The choice is not remembered**: no `storage` was passed. Without it the choice lasts until the app restarts.
- **Keys are not autocompleted**: run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`. The CLI adds the `dialexjs/react` declarations when `react-native` or `expo` is in `package.json`, and `dialexjs/react-native` shares them.
