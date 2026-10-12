# Preact

`dialexjs/preact`, Preact 10 ve sonrası için bir bağlam sağlayıcısı (provider) ve hook'lar sunar. `preact/compat` gerektirmez; bu yüzden düz Preact API'sini kullanan uygulamalarda çalışır.

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

## Sözlükleri kullanma

`useDictionary(name)` geçerli yerel ayarın sözlüğünü, `useT(...names)` ise bir `t("dictionary.key", values?)` fonksiyonu döndürür:

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

Değerler ICU mesajından tür denetimine tabi tutulur; bu yüzden yukarıdaki `count` bir sayı olmalıdır.

## Yerel ayarı değiştirme

`useDialex()` etkin `locale` ve `setLocale` değerlerini döndürür. Sağlayıcı seçimi `locale` çerezinde hatırlar ve `<html lang>` değerini eşzamanlı tutar:

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

## Sunucu tarafı oluşturma

`preact-render-to-string` ile ya da Fresh gibi bir çerçeveyle, sunucunun çözdüğü yerel ayarı `initialLocale` olarak ver; böylece işaretleme ile ilk istemci oluşturması uyuşur. İstekten çözmek için [`dialexjs/web`](./web.md) kullan:

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

| Dışa aktarım                   | Açıklama                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Ağaca yerel ayarı ve sözlükleri sağlar. Prop'lar: üretilen `dictionaries`, `config`, `loaders` ile birlikte `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` veya `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | `{ locale, setLocale, store }` döndürür. Bir `DialexProvider` dışında hata fırlatır                                                                                                                                                         |
| `useDictionary(name)`          | Geçerli yerel ayarın sözlüğü, yedek zincirini izleyerek. Yerel ayar değişince ve tembel bir sözlük yüklenince bileşen yeniden oluşturulur                                                                                                   |
| `useT(...names)`               | Geçerli yerel ayara bağlı bir `t("dictionary.key", values?)` fonksiyonu. Tembel yükleme ile yüklenmesi için sözlüklerin adını ver                                                                                                           |
| `useDialexConfig()`            | Üretilen `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                             |

## Tembel yükleme

`dialex.config.ts` içinde `lazy: true` veya `"locale"` ile `useDictionary`, sözlük yüklenene kadar boş bir nesne döndürür ve bileşen sözlük gelince yeniden oluşturulur. Sonraki görünümün ihtiyaç duyduğunu `preloadDictionaries` ile önceden yükle:

```ts
import { preloadDictionaries } from "dialexjs/preact";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Bağlantılar ve gezinme

URL'leriniz locale taşıyorsa (`/tr/about`), bağlantıları [Yönlendirme Yardımcıları](../guide/routing.md) sayfasındaki `localizePath` ve uygulamanın gösterdiği locale ile oluşturun. Dialex'in preact-iso için hazır bir bağlantı bileşeni yoktur: kendi yazacağınız birkaç satır `route()` ve yönlendirmelerin aynı şekilde çalışmasını sağlar ve bir yola tam olarak ne olduğunu gösterir. Üretilen `config` zaten `locales`, `defaultLocale` ve `prefixDefault` değerlerini taşır, bu yüzden hiçbir şey tekrar yazılmaz.

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

## En iyi uygulamalar

- `DialexProvider`'ı kökte bir kez oluştur. Altındaki her bileşen aynı yerel ayarı ve aynı yüklü sözlükleri paylaşır.
- Sunucuda oluştururken `initialLocale` ver. Yoksa sunucu varsayılan yerel ayarı oluşturur ve hatırlanan, bağlandıktan (mount) sonra uygulanır.
- Hook'ları, her Preact hook'unda olduğu gibi, bileşenin en üst düzeyinde çağır.
- Sayı veya seçim içeren metin için `useT("home")` kullan, düz dizeleri `useDictionary("home")` üzerinden oku.

## Sorun giderme

- **`useDialex must be used within a DialexProvider`**: bileşen sağlayıcının dışında oluşturuluyor. Kökü `<DialexProvider {...dialex}>` ile sarın.
- **Metin yüklenirken kısa süre varsayılan dili gösteriyor**: hatırlanan yerel ayar bağlandıktan sonra uygulanır. Sunucuda çöz ve `initialLocale` olarak ver.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et. `package.json` içinde `preact` varsa CLI `dialexjs/preact` bildirimlerini ekler.
