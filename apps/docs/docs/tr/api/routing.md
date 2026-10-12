# Yönlendirme

Yerel ayar önekli URL'ler, `hreflang` bağlantıları ve sitemap'ler için saf yardımcılar. Framework bağımlılıkları yoktur; sunucuda ve istemcide çalışırlar. Bir uygulamaya nasıl bağlanacakları için [Yönlendirme yardımcıları](../guide/routing.md) sayfasına bakın.

```ts
import { localizePath, stripLocale } from "dialexjs/routing";
```

## `RoutingOptions`

| Seçenek         | Tip        | Varsayılan | Açıklama                                                                                    |
| --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------- |
| `locales`       | `string[]` | —          | Desteklenen yerel ayarlar. Zorunlu                                                          |
| `defaultLocale` | `string`   | —          | Bir yolun öneki yoksa kullanılan yerel ayar. Bazı yardımcılar buna ihtiyaç duyar            |
| `prefixDefault` | `boolean`  | `true`     | Varsayılan yerel ayarın da önek alıp almayacağı. `false` ise öneksiz yolda durur (`/about`) |

## `localizePath(path, locale, options)`

```ts
function localizePath(path: string, locale: string, options: RoutingOptions): string;
```

Bir yolun başına yerel ayar ekler ve zaten olan yerel ayar önekini değiştirir. Sorgu dizeleri ve parçalar korunur. Harici URL'ler, `mailto:` bağlantıları ve yalın `#fragment`'ler değiştirilmeden döndürülür.

```ts
localizePath("/about", "tr", { locales: ["en", "tr"] }); // "/tr/about"
localizePath("/tr/about", "en", {
  locales: ["en", "tr"],
  defaultLocale: "en",
  prefixDefault: false,
}); // "/about"
```

## `stripLocale(path, locales)`

```ts
function stripLocale(path: string, locales: string[]): { path: string; locale?: string };
```

Baştaki yerel ayar bölümünü kaldırır. Yalnızca `locales` ile büyük/küçük harfe bakmayan tam eşleşme sayılır; bu yüzden `/english` olduğu gibi bırakılır.

```ts
stripLocale("/tr/about?x=1", ["en", "tr"]); // { path: "/about?x=1", locale: "tr" }
```

## `localeFromPath(path, options)`

```ts
function localeFromPath(path: string, options: RoutingOptions & { defaultLocale: string }): string;
```

Bir yolun altında bulunduğu yerel ayar ya da öneki yoksa `defaultLocale`.

```ts
localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
```

## `isLocale(value, locales)`

```ts
function isLocale(value: string, locales: string[]): boolean;
```

`value` değerinin tam olarak `locales` içinden biri olup olmadığı.

## `alternateLinks(path, options)`

```ts
function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[];
```

Her yerel ayar için bir `hreflang` alternatifi ve `xDefault` `false` değilse varsayılan yerel ayar için bir `x-default` girdisi üretir.

| Seçenek    | Tip       | Varsayılan | Açıklama                                                     |
| ---------- | --------- | ---------- | ------------------------------------------------------------ |
| `baseUrl`  | `string`  | —          | Mutlak URL'ler için kullanılan origin, `https://example.com` |
| `xDefault` | `boolean` | `true`     | Bir `x-default` girdisi ekler                                |

`RoutingOptions`'ın tüm alanlarını da kabul eder.

```ts
alternateLinks("/about", { locales: ["en", "tr"], baseUrl: "https://example.com" });
// [
//   { locale: "en", href: "https://example.com/en/about" },
//   { locale: "tr", href: "https://example.com/tr/about" },
//   { locale: "x-default", href: "https://example.com/en/about" },
// ]
```

## `alternateLanguages(path, options)`

```ts
function alternateLanguages(path: string, options: AlternateLinksOptions): Record<string, string>;
```

`alternateLinks` değerini `{ [locale]: url }` haritası olarak verir; Next.js `metadata.alternates.languages` biçimidir.

## `sitemapEntries(paths, options)`

```ts
function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[];
```

Her yol ve yerel ayar için bir girdi, her biri `hreflang` alternatifleriyle; Next.js `MetadataRoute.Sitemap` biçiminde.

```ts
// app/sitemap.ts
export default function sitemap() {
  return sitemapEntries(["/", "/about"], {
    locales: ["en", "tr"],
    baseUrl: "https://example.com",
  });
}
```

## Tipler

| Tip                     | Tanım                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AlternateLink`         | `{ locale: string; href: string }`. Varsayılan girdi için `locale` `"x-default"`'tır                |
| `AlternateLinksOptions` | `RoutingOptions` artı `baseUrl` ve `xDefault`                                                       |
| `SitemapEntry`          | `{ url: string; lastModified?: string \| Date; alternates: { languages: Record<string, string> } }` |
