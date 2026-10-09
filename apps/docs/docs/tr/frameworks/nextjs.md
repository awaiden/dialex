# Next.js

## Yapılandırma

```ts
// next.config.mjs
import { withDialex } from "dialexjs/next";

export default withDialex({
  // your Next.js config
});
```

`withDialex(nextConfig, inlineConfig?)` sözlük çözümlemesini webpack ve Turbopack'e bağlar, mevcut `webpack` fonksiyonunuzu korur ve üretilen dosyaları eşitler.

## Middleware

`createDialexMiddleware` her sayfayı bir yerel ayar önekinin altında tutar:

```ts
// middleware.ts
import { createDialexMiddleware } from "dialexjs/next/middleware";

export default createDialexMiddleware({
  locales: ["en", "tr"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

- `/about`, `/tr/about` adresine yönlendirilir. Yerel ayar sırasıyla `locale` çerezinden, sonra `?locale=` / `?lang=` parametresinden, sonra `Accept-Language` başlığından, sonra `defaultLocale` değerinden gelir.
- Zaten yerel ayarı olan bir yol olduğu gibi geçer ve yerel ayar `locale` çerezinde hatırlanır.
- `matcher` ayarınıza ek olarak `/_next`, `/api` ve dosya uzantısı olan her şey atlanır.

| Seçenek                            | Varsayılan             | Açıklama                                                                                                                                                                              |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales`                          | zorunlu                | Desteklenen yerel ayarlar                                                                                                                                                             |
| `defaultLocale`                    | `locales` içindeki ilk | Başka hiçbir şey belirleyemediğinde kullanılır                                                                                                                                        |
| `prefixDefault`                    | `true`                 | `false` olduğunda varsayılan yerel ayar önek almayan yolda (`/about`) yaşar; dahili olarak `/en/about` adresine yeniden yazılır ve `/en/about` tekrar `/about` adresine yönlendirilir |
| `cookieName`                       | `"locale"`             | Seçimi hatırlayan çerez                                                                                                                                                               |
| `setCookie`                        | `true`                 | URL'nin yerel ayarı çerezdekinden farklı olduğunda çerezi yazar                                                                                                                       |
| `ignore`                           | yukarıya bakın         | Atlanacak ek yollar için `(pathname) => boolean`                                                                                                                                      |
| `queryKeys`, `headerKey`, `custom` |                        | [Yerel ayar algılama](../guide/locale-detection.md#options) ile aynı                                                                                                                  |

Middleware edge üzerinde çalışır ve `dialex.config.ts` dosyasını okuyamaz; bu yüzden `locales` ve `prefixDefault` değerlerini açıkça verin ve bunları `DialexLink`'in okuduğu yapılandırmadaki değerlerle aynı tutun.

## Bağlantılar

`DialexLink`, geçerli yerel ayarı URL'de tutan `next/link`'tir. Yerel ayarı `[locale]` rota parametresinden alır:

```tsx
import { DialexLink } from "dialexjs/next/link";

<DialexLink href="/about">About</DialexLink>; // /tr/about while viewing /tr/...
<DialexLink href="/about" locale="en">
  English
</DialexLink>; // /en/about
```

`locales`, `defaultLocale` ve `prefixDefault` değerlerini `dialex.config.ts` dosyasından okur. Harici URL'lere ve `#parçalara` dokunmaz. Ayrıca bkz. [Yönlendirme yardımcıları](../guide/routing.md).

## Server Components

```tsx
// src/app/[locale]/page.tsx
import { getDictionary } from "dialexjs/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary("home", locale as any);

  return (
    <main>
      <h1>{dict.title}</h1>
      <p>{dict.greeting("User")}</p>
    </main>
  );
}
```

`getDictionary(name, locale?)`, `locale` verilmediğinde ya da sözlükte bulunmadığında [yedek zincirini](../guide/fallbacks.md) izler ve bir sözlük bulunamadığında uyarı kaydeder.

## SEO: hreflang ve site haritası

```tsx
import { alternateLanguages, sitemapEntries } from "dialexjs/routing";

const routing = { locales: ["en", "tr"], defaultLocale: "en", baseUrl: "https://example.com" };

// app/[locale]/about/page.tsx
export const generateMetadata = () => ({
  alternates: { languages: alternateLanguages("/about", routing) },
});

// app/sitemap.ts
export default () => sitemapEntries(["/", "/about"], routing);
```
