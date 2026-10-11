# React Native

`dialexjs/react-native`, React Native ve Expo uygulamaları için sağlayıcıdır. Yerel bir uygulamada çerez, `localStorage` ve URL yoktur; bu yüzden sağlayıcı cihazın dillerini ve zaten kullandığın bir depolamayı alır, hook'lar ise [React](./react.md) ile aynıdır.

## Kurulum

Çalışma zamanı kütüphanesini ve CLI'ı kurun:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Kurulum adımları

Yerel ayarlarınızla `dialex.config.ts` oluşturun (veya paketleri ve bir başlangıç sözlüğünü de ekleyen `dialex init` komutunu çalıştırın):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Bir sözlüğü onu kullanan kodun yanına yazın. Her yerel ayarın anahtarları aynıdır:

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

Sözlükleri `dialex.generated.ts` dosyasına ve tip bildirimlerine derleyin. Bir sözlük değiştiğinde yeniden çalıştırın veya `dx generate --watch` komutunu açık tutun:

```bash
npx dx generate
```

Uygulamayı `DialexProvider` ile sar. Expo ile cihazın dillerini `expo-localization`'dan oku ve kullanıcının seçimini AsyncStorage ile hatırla:

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

Sağlayıcı, uygulamanın desteklediği ilk cihaz dilini seçer, ardından `storage` içinde hatırlanan yerel ayarı okunur okunmaz uygular ve sonraki her değişikliği geri yazar.

## Sözlükleri kullanma

`useDictionary(name)` ve `useT(...names)` React'teki gibi çalışır:

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

Değerler ICU mesajından tür denetimine tabi tutulur; bu yüzden yukarıdaki `count` bir sayı olmalıdır.

## Yerel ayarı değiştirme

`useDialex()` etkin `locale` ve `setLocale` değerlerini döndürür:

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

## Depolama

`storage`, `getItem(key)` ve `setItem(key, value)` olan, eşzamanlı ya da promise döndüren herhangi bir şeydir. AsyncStorage uygundur; MMKV veya `expo-secure-store` etrafındaki küçük bir sarmalayıcı da öyle:

```ts
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const storage = {
  getItem: (key: string) => mmkv.getString(key),
  setItem: (key: string, value: string) => mmkv.set(key, value),
};
```

## API

| Dışa aktarım                   | Açıklama                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Ağaca yerel ayarı ve sözlükleri sağlar. Prop'lar: üretilen `dictionaries`, `config`, `loaders` ile birlikte `deviceLocales` (bir dize ya da dizi, en çok tercih edilen önce), `storage`, `storageKey` (varsayılan `"locale"`), `defaultLocale`, `initialLocale`, `onLocaleChange(locale)` |
| `useDialex()`                  | `{ locale, setLocale, store }` döndürür. Bir `DialexProvider` dışında hata fırlatır                                                                                                                                                                                                       |
| `useDictionary(name)`          | Geçerli yerel ayarın sözlüğü, yedek zincirini izleyerek. Tembel yüklemede sözlük yüklenene kadar askıya alır (suspend)                                                                                                                                                                    |
| `useT(...names)`               | Geçerli yerel ayara bağlı bir `t("dictionary.key", values?)` fonksiyonu. Tembel yükleme ile yüklenmesi için sözlüklerin adını ver                                                                                                                                                         |
| `useDialexConfig()`            | Üretilen `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                                                                           |

## En iyi uygulamalar

- Kökte, gezinmenin üstünde tek bir `DialexProvider` tut; böylece her ekran yerel ayarı paylaşır.
- İlk açılışın cihazın dilinde olması için `deviceLocales` ver. Bundan sonra kayıtlı seçim geçerlidir.
- `storage` ile, kayıtlı yerel ayar okunana kadar hiçbir şey oluşturulmaz; böylece ilk ekran daha en baştan doğru dildedir. O zamana kadar açılış ekranını (splash) açık tut.
- `initialLocale`'i yalnızca yerel ayarı kendin belirlediğinde ver, örneğin bir hesap ayarından. Cihazdan ve depolamadan önceliklidir.
- Cihaz dili yalnızca kullanıcı seçene kadar önemlidir. Seçimi bir ayarlar ekranında göster ve `setLocale`'i oradan çağır.

## Sorun giderme

- **`useDialex must be used within a DialexProvider`**: bileşen sağlayıcının dışında oluşturuluyor. Kök bileşeni `<DialexProvider {...dialex}>` ile sar.
- **Uygulama varsayılan dilde açılıyor**: `deviceLocales` içindeki hiçbir girdi yapılandırılmış bir yerel ayarla eşleşmiyor ya da `deviceLocales` verilmedi. `en-US`, `en` ile eşleşir ama `pt-BR`, `en` ile eşleşmez.
- **Seçim hatırlanmıyor**: `storage` verilmedi. Olmadan seçim uygulama yeniden başlatılana kadar sürer.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et. `package.json` içinde `react-native` veya `expo` varsa CLI `dialexjs/react` bildirimlerini ekler ve `dialexjs/react-native` bunları paylaşır.
