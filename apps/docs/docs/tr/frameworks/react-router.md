# React Router

Framework modundaki React Router (v7 ve sonrası, eski adıyla Remix) sunucuda oluşturur; bu yüzden yerel ayarın istekte belirlenip istemciye iletilmesi gerekir. Dialex bunu iki parçayla yapar: `dialexjs/web` bir loader içinde standart bir `Request`'ten yerel ayarı çözer ve `dialexjs/react` uygulamayı o yerel ayarda oluşturur. Ek bir adaptör gerekmez. `examples/react-router` projesi bunu baştan sona gösterir.

## Kurulum

Çalışma zamanı kütüphanesini ve CLI'ı kurun:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Kurulum adımları

React Router kaynak kodunu `app/` içinde tutar; bu yüzden Dialex'e üretilen dosyayı nereye yazacağını `output` ile söyleyin:

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
});
```

Bir sözlüğü onu kullanan kodun yanına yazın. Her yerel ayarın anahtarları aynıdır:

```ts
// app/content/home.content.ts
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

## Yerel ayarı sunucuda algılama

İstek işleyicisini bir kez oluşturun. `defaultLocale`, `locales` ve `fallbacks` değerlerini üretilen yapılandırmadan okur ve yerel ayarı sırasıyla `?lang=`, `locale` çerezi, `Accept-Language` ve varsayılandan bulur. `.server` soneki dosyayı istemci paketinin dışında tutar:

```ts
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });
```

## Uygulamayı o yerel ayarda oluşturma

Yerel ayarı kök loader'dan döndürün, `<html lang>` üzerine koyun ve istemcinin ilk oluşturması sunucunun HTML'iyle eşleşsin diye sağlayıcıya `initialLocale` olarak verin:

```tsx
// app/root.tsx
import { DialexProvider } from "dialexjs/react";
import { Links, Meta, Outlet, Scripts, useLoaderData, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/root";
import { dialex } from "./dialex.generated";
import { resolveDialex } from "./dialex.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await resolveDialex(request);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Also renders for error pages, where the loader data may be missing.
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang={data?.locale ?? "en"}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  return (
    <DialexProvider {...dialex} initialLocale={locale}>
      <Outlet />
    </DialexProvider>
  );
}
```

## Rotalarda sözlükleri kullanma

Bileşenlerde `dialexjs/react` kancalarını kullanın. Bir loader veya action içinde sunucuda ihtiyaç duyduğunuz metin için aynı işleyiciyi kullanın, örneğin sayfa başlığı:

```tsx
// app/routes/home.tsx
import { useDictionary, useT } from "dialexjs/react";

import { resolveDialex } from "../dialex.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const { getDictionary } = await resolveDialex(request);
  return { title: getDictionary("home").title as string };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData.title }];
}

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count: 3 })}</p>
    </>
  );
}
```

## Yerel ayarı değiştirme

`setLocale` sağlayıcıyı günceller ve `locale` çerezini yazar. Sunucuda oluşturulan kısımların (`<html lang>` ve loader metinleri) izlemesi için ardından loader'ları yeniden doğrulayın:

```tsx
import { useDialex } from "dialexjs/react";
import { useRevalidator } from "react-router";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const { revalidate } = useRevalidator();

  return (
    <select
      value={locale}
      onChange={(event) => {
        setLocale(event.target.value);
        void revalidate();
      }}
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

## En iyi uygulamalar

- Yerel ayarı yalnızca kök loader'da çözün ve alt rotalarda `useRouteLoaderData("root")` ile veya sağlayıcıdan okuyun. Her rotada yeniden çözmek işi tekrarlar ve uyuşmazlık yaratabilir.
- Sunucuda üretilen metin için (başlıklar, e-postalar, hata mesajları) `dialexjs/web` ve bileşenlerde oluşturulan metin için React kancalarını kullanın. İkisi de aynı sözlükleri okur.
- Arama motorlarının veya önbelleklerin dile göre ayrım yapması gerekiyorsa işleyicinin sonucundaki `applyHeaders` ile yanıtlarda `Content-Language` ayarlayın.
- Site dil başına dizinlenecekse çereze güvenmek yerine [yönlendirme yardımcılarıyla](../guide/routing.md) her dile kendi URL'sini verin (`/en/about`, `/tr/about`).

## Sorun giderme

- **`Cannot find module './+types/root'`**: React Router rota tiplerini üretir. Tip denetiminden önce `react-router typegen` çalıştırın (örneğin `typecheck` betiği bunu yapar).
- **Üretilen dosya bulunamıyor**: `src/` klasörü yoksa Dialex dosyayı proje köküne yazar. `dialex.config.ts` içinde `output: "app/dialex.generated.ts"` ayarlayın.
- **Hidrasyon uyuşmazlığı veya dil yanıp sönmesi**: sağlayıcı `initialLocale` olmadan oluşturuldu. Loader'ın yerel ayarını geçirin.
- **Değiştirdikten sonra sayfa eski dilde kalıyor**: loader'lar yeniden doğrulanmadı. `setLocale` sonrasında `revalidate()` çağırın veya rotayı yeniden yükleyin.
