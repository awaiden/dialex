# Qwik

`dialexjs/qwik`, Qwik hook'larını sözlüklerine bağlar. Qwik bileşen durumunu HTML'e serileştirir ve istemcide devam eder; sözlükler serileştirilemeyen fonksiyonlar içerdiğinden kendi modüllerinde kalır. Sayfada yalnızca etkin yerel ayar, yani bir dize, yolculuk eder.

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

Hook'ları bir modülde bir kez bağla ve oradan içe aktar:

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

`useDialexProvider()`'ı kök düzende (layout) çağır:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

import { useDialexProvider } from "../i18n";

export default component$(() => {
  useDialexProvider();
  return <Slot />;
});
```

## Sözlükleri kullanma

`useDictionary(name)` geçerli yerel ayarın sözlüğü için bir erişimci (accessor) döndürür; böylece JSX `home().title` okur. `useT()` ise bir `t("dictionary.key", values?)` fonksiyonu döndürür. Bunları okuyan bileşenler yerel ayar değişince yeniden oluşturulur:

```tsx
import { component$ } from "@builder.io/qwik";

import { useDictionary, useT } from "../i18n";

export default component$(() => {
  const home = useDictionary("home");
  const t = useT();

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: 2 })}</p>
    </>
  );
});
```

Değerler ICU mesajından tür denetimine tabi tutulur; bu yüzden yukarıdaki `count` bir sayı olmalıdır.

## Yerel ayarı değiştirme

`useDialex()` sağlayıcının durumunu döndürür, `setLocale(state, locale)` ise onu değiştirir. `setLocale` düz bir fonksiyondur; bu yüzden bir `onClick$`, serileştirilemeyen hiçbir şeyi yakalamadan onu kullanabilir:

```tsx
import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();

  return (
    <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
});
```

`setLocale` seçimi `locale` çerezinde hatırlar ve `<html lang>` değerini eşzamanlı tutar.

## Yerel ayarı sunucuda çözme

Yerel ayarı, bir `routeLoader$` içinde [`dialexjs/web`](./web.md) ile istekten çöz ve sağlayıcıya ver. Sunucudaki ilk oluşturma ile devam eden istemci böylece uyuşur:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";
import { useDialexProvider } from "../i18n";

const resolveDialex = createDialexHandler({ ...dialex });

export const useLocale = routeLoader$(async ({ request }) => {
  const { locale } = await resolveDialex(request);
  return locale;
});

export default component$(() => {
  const locale = useLocale();
  useDialexProvider({ initialLocale: locale.value });
  return <Slot />;
});
```

## API

`createDialexQwik({ ...dialex })` üretilen `dictionaries`, `config` ve `loaders` değerlerini, ayrıca `persist` (`"cookie"`, `"localStorage"` veya `false`) ve `storageKey` değerlerini kabul eder. Şunları döndürür:

| Dışa aktarım                           | Açıklama                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `useDialexProvider({ initialLocale })` | Aşağıdaki bileşenlere yerel ayarı sağlar. Kök düzende bir kez çağır                                         |
| `useDialex()`                          | Sağlayıcı durumunu, `{ locale }`, döndürür. `locale` değerini oku; `setLocale` ile değiştir                 |
| `setLocale(state, locale)`             | Yerel ayarı değiştirir, hatırlar ve `<html lang>` değerini eşzamanlı tutar                                  |
| `getPersistedLocale()`                 | Bu tarayıcıda hatırlanan yerel ayar, uygulama destekliyorsa. Sunucuda `undefined`                           |
| `useDictionary(name)`                  | Geçerli yerel ayarın sözlüğü için bir erişimci, yedek zincirini izleyerek. JSX içinde çağır: `home().title` |
| `useT()`                               | Geçerli yerel ayara bağlı bir `t("dictionary.key", values?)` fonksiyonu                                     |

## Bağlantılar ve gezinme

URL'leriniz locale taşıyorsa (`/tr/about`), bağlantıları [Yönlendirme Yardımcıları](../guide/routing.md) sayfasındaki `localizePath` ve uygulamanın gösterdiği locale ile oluşturun. Dialex'in Qwik City için hazır bir bağlantı bileşeni yoktur: kendi yazacağınız birkaç satır `useNavigate()` ve yönlendirmelerin aynı şekilde çalışmasını sağlar ve bir yola tam olarak ne olduğunu gösterir. Üretilen `config` zaten `locales`, `defaultLocale` ve `prefixDefault` değerlerini taşır, bu yüzden hiçbir şey tekrar yazılmaz.

```tsx
import { component$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { localizePath } from "dialexjs/routing";

import { config } from "./dialex.generated";
import { useDialex } from "./i18n";

export const Nav = component$(() => {
  const dialex = useDialex();
  const navigate = useNavigate();
  const localize = (path: string) => localizePath(path, dialex.locale, config);

  return (
    <>
      <Link href={localize("/about")}>About</Link>
      <button onClick$={() => navigate(localizePath("/cart", dialex.locale, config))}>Cart</button>
    </>
  );
});
```

## En iyi uygulamalar

- Hook'ları `createDialexQwik` ile tek bir modülde oluştur ve oradan içe aktar. `createDialexQwik`'i bir bileşenin içinde çağırma; çünkü sözlükler bileşen durumunun parçası olmamalıdır.
- `useDialex().locale` değerini düzende değil, ihtiyaç duyan bileşende oku; böylece değişimde yalnızca o bileşen yeniden oluşturulur.
- Sunucuda oluşturulan sayfalarda `initialLocale` değerini bir `routeLoader$`'dan ver; böylece hatırlanan yerel ayarı olan ziyaretçi varsayılan dilin kısa süreli parlamasını görmez.
- Tembel yüklemede, sunucu oluşturması metne zaten sahip olsun diye bir `routeLoader$` içinde `await preloadDictionaries(dialex, "home")` kullan. Tarayıcıda bileşenler bir yükleme bittiğinde yeniden oluşturulur.
- Erişimciyi JSX içinde çağır (`home().title`); `home()` sonucunu bir kez değişkene kopyalama. Qwik, kopyalanan nesnenin düz özellik okumalarını yerel ayar değişince yenilemez.

## Sorun giderme

- **Hook'lar sağlayıcıyı bulamıyor**: bileşen sağlayıcının dışında oluşturuluyor. `useDialexProvider()`'ı bileşenin üstündeki bir düzende çağır.
- **Qwik serileştirilemeyen bir değer bildiriyor**: bir sözlük ya da `useT()` sonucu, örneğin bir `onClick$` gibi bir `$` kapanışı (closure) tarafından yakalandı. İhtiyacın olan metni bileşen oluşturulurken oku ve kapanışa yalnızca düz değerler geçir.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et. `package.json` içinde `@builder.io/qwik` varsa CLI `dialexjs/qwik` bildirimlerini ekler.
