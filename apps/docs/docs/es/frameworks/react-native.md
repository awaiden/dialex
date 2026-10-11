# React Native

`dialexjs/react-native` es el proveedor para apps de React Native y Expo. Una app nativa no tiene cookies, ni `localStorage`, ni URL, así que el proveedor recibe los idiomas del dispositivo y un almacenamiento que ya usas, y los hooks son los mismos que en [React](./react.md).

## Instalación

Instala el runtime y la CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Configuración

Crea `dialex.config.ts` con tus locales (o ejecuta `dialex init`, que también añade los paquetes y un diccionario inicial):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Escribe un diccionario junto al código que lo usa. Cada locale tiene las mismas claves:

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

Compila los diccionarios en `dialex.generated.ts` y las declaraciones de tipos. Ejecútalo de nuevo cuando cambie un diccionario, o deja `dx generate --watch` en marcha:

```bash
npx dx generate
```

Envuelve la app en `DialexProvider`. Con Expo, lee los idiomas del dispositivo de `expo-localization` y recuerda la elección del usuario con AsyncStorage:

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

El proveedor elige el primer idioma del dispositivo que la app admite, luego aplica el locale recordado en `storage` en cuanto se ha leído, y escribe de vuelta cada cambio posterior.

## Usar diccionarios

`useDictionary(name)` y `useT(...names)` funcionan como en React:

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

Los valores se comprueban por tipo a partir del mensaje ICU, por lo que `count` arriba debe ser un número.

## Cambiar el locale

`useDialex()` devuelve el `locale` activo y `setLocale`:

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

## Almacenamiento

`storage` es cualquier cosa con `getItem(key)` y `setItem(key, value)`, síncrona o que devuelva una promesa. AsyncStorage encaja, y también un pequeño envoltorio sobre MMKV o `expo-secure-store`:

```ts
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const storage = {
  getItem: (key: string) => mmkv.getString(key),
  setItem: (key: string, value: string) => mmkv.set(key, value),
};
```

## API

| Exportación                    | Descripción                                                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Proporciona el locale y los diccionarios al árbol. Props: los `dictionaries`, `config` y `loaders` generados, más `deviceLocales` (una cadena o un array, el preferido primero), `storage`, `storageKey` (por defecto `"locale"`), `defaultLocale`, `initialLocale`, `onLocaleChange(locale)` |
| `useDialex()`                  | Devuelve `{ locale, setLocale, store }`. Lanza un error fuera de un `DialexProvider`                                                                                                                                                                                                          |
| `useDictionary(name)`          | El diccionario del locale actual, siguiendo la cadena de fallback. Con carga diferida suspende hasta que el diccionario se ha cargado                                                                                                                                                         |
| `useT(...names)`               | Una función `t("dictionary.key", values?)` ligada al locale actual. Nombra los diccionarios para cargarlos con carga diferida                                                                                                                                                                 |
| `useDialexConfig()`            | La `config` generada (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                                                                            |

## Buenas prácticas

- Mantén un solo `DialexProvider` en la raíz, por encima de la navegación, para que cada pantalla comparta el locale.
- Pasa `deviceLocales` para que el primer arranque se abra en el idioma del dispositivo. Después prevalece la elección guardada.
- Pasa `initialLocale` solo cuando decidas tú el locale, por ejemplo a partir de un ajuste de la cuenta. Prevalece sobre el dispositivo y el almacenamiento.
- El idioma del dispositivo solo importa hasta que el usuario elige. Muestra la elección en una pantalla de ajustes y llama a `setLocale` desde allí.

## Solución de problemas

- **`useDialex must be used within a DialexProvider`**: el componente se renderiza fuera del proveedor. Envuelve el componente raíz en `<DialexProvider {...dialex}>`.
- **La app se abre en el idioma predeterminado**: ninguna entrada de `deviceLocales` coincide con un locale configurado, o no se pasó `deviceLocales`. `en-US` coincide con `en`, pero `pt-BR` no coincide con `en`.
- **La elección no se recuerda**: no se pasó `storage`. Sin él, la elección dura hasta que la app se reinicia.
- **Las claves no se autocompletan**: ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/react` cuando `react-native` o `expo` está en `package.json`, y `dialexjs/react-native` las comparte.
