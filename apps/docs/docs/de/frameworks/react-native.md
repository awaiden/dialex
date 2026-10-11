# React Native

`dialexjs/react-native` ist der Provider für React-Native- und Expo-Apps. Eine native App hat keine Cookies, kein `localStorage` und keine URL; deshalb nimmt der Provider die Sprachen des Geräts und einen Speicher, den du ohnehin nutzt, und die Hooks sind dieselben wie in [React](./react.md).

## Installation

Installiere die Laufzeitbibliothek und das CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Einrichten

Lege `dialex.config.ts` mit deinen Locales an (oder führe `dialex init` aus, das auch die Pakete und ein Start-Wörterbuch hinzufügt):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Schreibe ein Wörterbuch neben den Code, der es verwendet. Jedes Locale hat dieselben Schlüssel:

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

Kompiliere die Wörterbücher zu `dialex.generated.ts` und den Typdeklarationen. Führe es erneut aus, wenn sich ein Wörterbuch ändert, oder lasse `dx generate --watch` laufen:

```bash
npx dx generate
```

Umschließe die App mit `DialexProvider`. Mit Expo liest du die Sprachen des Geräts aus `expo-localization` und merkst dir die Auswahl des Nutzers mit AsyncStorage:

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

Der Provider wählt die erste Gerätesprache, die die App unterstützt, wendet dann das in `storage` gemerkte Locale an, sobald es gelesen wurde, und schreibt jede spätere Änderung zurück.

## Wörterbücher verwenden

`useDictionary(name)` und `useT(...names)` funktionieren wie in React:

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

Die Werte werden anhand der ICU-Nachricht typgeprüft, daher muss `count` oben eine Zahl sein.

## Das Locale wechseln

`useDialex()` gibt das aktive `locale` und `setLocale` zurück:

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

## Speicher

`storage` ist alles mit `getItem(key)` und `setItem(key, value)`, synchron oder mit einem Promise als Ergebnis. AsyncStorage passt, ebenso ein kleiner Wrapper um MMKV oder `expo-secure-store`:

```ts
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const storage = {
  getItem: (key: string) => mmkv.getString(key),
  setItem: (key: string, value: string) => mmkv.set(key, value),
};
```

## API

| Export                         | Beschreibung                                                                                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<DialexProvider {...dialex}>` | Stellt dem Baum Locale und Wörterbücher bereit. Props: die generierten `dictionaries`, `config`, `loaders` sowie `deviceLocales` (ein String oder ein Array, die bevorzugte Sprache zuerst), `storage`, `storageKey` (Standard `"locale"`), `defaultLocale`, `initialLocale`, `onLocaleChange(locale)` |
| `useDialex()`                  | Gibt `{ locale, setLocale, store }` zurück. Wirft außerhalb eines `DialexProvider` einen Fehler                                                                                                                                                                                                        |
| `useDictionary(name)`          | Das Wörterbuch für das aktuelle Locale, entlang der Fallback-Kette. Mit Lazy Loading wird gewartet (Suspense), bis das Wörterbuch geladen ist                                                                                                                                                          |
| `useT(...names)`               | Eine Funktion `t("dictionary.key", values?)`, die an das aktuelle Locale gebunden ist. Nenne die Wörterbücher, um sie mit Lazy Loading zu laden                                                                                                                                                        |
| `useDialexConfig()`            | Die generierte `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                                                                                  |

## Bewährte Vorgehensweisen

- Verwende einen einzigen `DialexProvider` an der Wurzel, oberhalb der Navigation, damit jeder Bildschirm das Locale teilt.
- Übergib `deviceLocales`, damit der erste Start in der Sprache des Geräts öffnet. Danach gewinnt die gespeicherte Auswahl.
- Mit `storage` wird nichts gerendert, bis das gespeicherte Locale gelesen wurde, sodass der erste Bildschirm schon in der richtigen Sprache erscheint. Lass den Splash-Screen so lange stehen.
- Übergib `initialLocale` nur, wenn du das Locale selbst bestimmst, zum Beispiel aus einer Kontoeinstellung. Es hat Vorrang vor Gerät und Speicher.
- Die Gerätesprache zählt nur, bis der Nutzer wählt. Zeige die Auswahl in einem Einstellungsbildschirm und rufe dort `setLocale` auf.

## Fehlerbehebung

- **`useDialex must be used within a DialexProvider`**: Die Komponente wird außerhalb des Providers gerendert. Umschließe die Wurzelkomponente mit `<DialexProvider {...dialex}>`.
- **Die App öffnet in der Standardsprache**: Kein Eintrag von `deviceLocales` passt zu einem konfigurierten Locale, oder `deviceLocales` wurde nicht übergeben. `en-US` passt zu `en`, aber `pt-BR` passt nicht zu `en`.
- **Die Auswahl wird nicht gemerkt**: Es wurde kein `storage` übergeben. Ohne ihn gilt die Auswahl nur bis zum Neustart der App.
- **Schlüssel werden nicht automatisch vervollständigt**: Führe `dx generate` aus und binde `dialex-env.d.ts` in deine `tsconfig` ein. Die CLI fügt die Deklarationen von `dialexjs/react` hinzu, wenn `react-native` oder `expo` in `package.json` steht, und `dialexjs/react-native` teilt sie.
