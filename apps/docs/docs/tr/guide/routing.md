# Yönlendirme Yardımcıları

`dialexjs/routing` içinden, yerel ayar öneki taşıyan URL'ler için çerçeveden bağımsız yardımcılar.

```ts
import {
  localizePath,
  stripLocale,
  alternateLinks,
  alternateLanguages,
  sitemapEntries,
} from "dialexjs/routing";

const options = { locales: ["en", "tr"], defaultLocale: "en" };

localizePath("/about", "tr", options); // "/tr/about"
localizePath("/en/about", "tr", options); // "/tr/about" (an existing prefix is replaced)
stripLocale("/tr/about", ["en", "tr"]); // { path: "/about", locale: "tr" }
```

## `localizePath(path, locale, options)`

Bir yolun başına yerel ayar ekler. Sorgu dizeleri ve parça tanımlayıcıları korunur. Harici URL'ler (`https://...`, `//cdn...`), `mailto:` bağlantıları ve yalın `#parçalar` değiştirilmeden döndürülür.

`prefixDefault: false` ile varsayılan yerel ayar önek almaz:

```ts
const asNeeded = { ...options, prefixDefault: false };
localizePath("/about", "en", asNeeded); // "/about"
localizePath("/about", "tr", asNeeded); // "/tr/about"
```

## `stripLocale(path, locales)`

Baştaki yerel ayar segmentini kaldırır ve hangisi olduğunu söyler. Yalnızca tam ve büyük/küçük harfe duyarsız eşleşmeler sayılır; bu yüzden `/english/about` olduğu gibi bırakılır.

## `localeFromPath(path, options)` and `isLocale(value, locales)`

`localeFromPath`, bir yolun hangi dilin altında olduğunu döndürür; ön ek yoksa `defaultLocale` döner. `isLocale` ise bir dizeyi (örneğin bir rota parametresini) desteklenen dillerinize karşı denetler.

```ts
localeFromPath("/tr/about", options); // "tr"
localeFromPath("/about", options); // "en"
isLocale("tr", options.locales); // true
```

## hreflang ve site haritaları

```ts
const seo = { ...options, baseUrl: "https://example.com" };

alternateLinks("/about", seo);
// [{ locale: "en", href: "https://example.com/en/about" },
//  { locale: "tr", href: "https://example.com/tr/about" },
//  { locale: "x-default", href: "https://example.com/en/about" }]

alternateLanguages("/about", seo); // { en: "...", tr: "...", "x-default": "..." }
sitemapEntries(["/", "/about"], { ...seo, lastModified: "2024-01-01" });
```

`alternateLanguages`, Next.js'in `metadata.alternates.languages` biçimiyle eşleşir; `sitemapEntries` her yol ve yerel ayar için, her biri `alternates.languages` içeren birer kayıt döndürür ve `MetadataRoute.Sitemap` ile uyumludur. `x-default` girdisini dışarıda bırakmak için `xDefault: false` verin.

Next.js için ayrıca [`createDialexMiddleware` ve `DialexLink`](../frameworks/nextjs.md) vardır.
