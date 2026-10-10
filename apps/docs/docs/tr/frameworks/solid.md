# Solid

`dialexjs/solid`, SolidJS için bir bağlam sağlayıcısı ve ince taneli erişimciler sunar. Bir sözlük bir erişimcidir; JSX `home().title` okur ve yerel ayar değiştiğinde yalnızca onu kullanan metin düğümleri güncellenir.

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

Uygulamayı `DialexProvider` ile sarın ve üretilen `dialex` dışa aktarımını ona yayın:

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

## Sözlükleri kullanma

`useDictionary(name)` bir erişimci döndürür. Okumanın izlenmesi için JSX içinde veya bir efektin içinde çağırın:

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

`useT(...names)`, bir `t("dictionary.key", values?)` fonksiyonu döndürür. Değerler ICU mesajından tip denetimine tabi tutulur, bu nedenle yukarıdaki `count` bir sayı olmalıdır.

## Yerel ayarı değiştirme

`useDialex()`, `locale` erişimcisini ve `setLocale` işlevini döndürür. Sağlayıcı seçimi `locale` çerezinde saklar ve `<html lang>` değerini eşzamanlı tutar:

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

| Dışa aktarım                   | Açıklama                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Ağaca yerel ayarı ve sözlükleri sağlar. Prop'lar: üretilen `dictionaries`, `config`, `loaders` ile birlikte `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` veya `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | `{ locale, setLocale, store }` döndürür. `locale` bir erişimcidir. `DialexProvider` dışında hata fırlatır                                                                                                                                   |
| `useDictionary(name)`          | Geçerli yerel ayarın sözlüğünün erişimcisi, yedek zincirini izler. Yerel ayar değiştiğinde ve tembel bir sözlük yüklendiğinde güncellenir                                                                                                   |
| `useT(...names)`               | Geçerli yerel ayarı izleyen bir `t("dictionary.key", values?)` fonksiyonu. Tembel yüklemede yüklenmeleri için sözlükleri adlandırın                                                                                                         |

## Tembel yükleme

`dialex.config.ts` içinde `lazy: true` veya `"locale"` ile `useDictionary`, sözlük yüklenene kadar boştur ve sonra erişimciyi günceller. Sonraki görünümün ihtiyacı olanı `preloadDictionaries` ile önceden yükleyin:

```ts
import { preloadDictionaries } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## En iyi uygulamalar

- Erişimciyi kullandığınız yerde okuyun (`{home().title}`); bileşenin başında bir kez düz bir değişkene okumayın. Erişimciden kopyalanan bir değer yerel ayar değiştiğinde güncellenmez.
- `useDictionary` ve `useT` işlevlerini, Solid'in bağlamını okudukları için bileşen oluşturulurken (en üst düzeyde) çağırın. Olay işleyicilerinde çağırmayın.
- Listeler ve koşullar için `<For>` ve `<Show>` kullanın, içlerinde sözlükten gelen metinle; Dialex dizeleri düz değerlerdir ve her Solid akış denetimi bileşeniyle çalışır.
- Sayı veya seçim içeren metinler için ICU mesajları kullanın ve değiştiklerinde mesajın yeniden oluşturulması için reaktif değerleri (`count()`) geçirin.

## Sorun giderme

- **`useDialex must be used within a DialexProvider`**: bileşen sağlayıcının dışında oluşturuluyor. Kökü `<DialexProvider {...dialex}>` ile sarın.
- **Yerel ayar değişince metin değişmiyor**: erişimci JSX veya bir efektin dışında bir kez okundu. Metnin oluşturulduğu yerde `home()` çağırın.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştırın ve `dialex-env.d.ts` dosyasını `tsconfig` içine ekleyin. `package.json` içinde `solid-js` varsa CLI `dialexjs/solid` bildirimlerini ekler.
