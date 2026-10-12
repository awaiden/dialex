# Routing

Pure helpers for locale-prefixed URLs, `hreflang` links and sitemaps. They have no framework dependency and run on the server and the client. For how to wire them into an app see [Routing Helpers](../guide/routing.md).

```ts
import { localizePath, stripLocale } from "dialexjs/routing";
```

## `RoutingOptions`

| Option          | Type       | Default | Description                                                                                            |
| --------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `locales`       | `string[]` | —       | Supported locales. Required                                                                            |
| `defaultLocale` | `string`   | —       | Locale used when a path has no prefix. Some helpers need it                                            |
| `prefixDefault` | `boolean`  | `true`  | Whether the default locale also gets a prefix. When `false` it lives at the unprefixed path (`/about`) |

## `localizePath(path, locale, options)`

```ts
function localizePath(path: string, locale: string, options: RoutingOptions): string;
```

Prefixes a path with a locale and replaces a locale prefix it already has. Query strings and fragments are kept. External URLs, `mailto:` links and bare `#fragments` are returned unchanged.

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

Removes a leading locale segment. Only an exact, case-insensitive match of `locales` counts, so `/english` is left alone.

```ts
stripLocale("/tr/about?x=1", ["en", "tr"]); // { path: "/about?x=1", locale: "tr" }
```

## `localeFromPath(path, options)`

```ts
function localeFromPath(path: string, options: RoutingOptions & { defaultLocale: string }): string;
```

The locale a path is under, or `defaultLocale` when it has no prefix.

```ts
localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
```

## `isLocale(value, locales)`

```ts
function isLocale(value: string, locales: string[]): boolean;
```

Whether `value` is exactly one of `locales`.

## `alternateLinks(path, options)`

```ts
function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[];
```

Builds one `hreflang` alternate per locale and, unless `xDefault` is `false`, an `x-default` entry for the default locale.

| Option     | Type      | Default | Description                                          |
| ---------- | --------- | ------- | ---------------------------------------------------- |
| `baseUrl`  | `string`  | —       | Origin used for absolute URLs, `https://example.com` |
| `xDefault` | `boolean` | `true`  | Add an `x-default` entry                             |

It also takes every `RoutingOptions` field.

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

`alternateLinks` as a `{ [locale]: url }` map, the shape of Next.js `metadata.alternates.languages`.

## `sitemapEntries(paths, options)`

```ts
function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[];
```

One entry per path and locale, each with its `hreflang` alternates, in the shape of Next.js `MetadataRoute.Sitemap`.

```ts
// app/sitemap.ts
export default function sitemap() {
  return sitemapEntries(["/", "/about"], {
    locales: ["en", "tr"],
    baseUrl: "https://example.com",
  });
}
```

## Types

| Type                    | Definition                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AlternateLink`         | `{ locale: string; href: string }`. `locale` is `"x-default"` for the default entry                 |
| `AlternateLinksOptions` | `RoutingOptions` plus `baseUrl` and `xDefault`                                                      |
| `SitemapEntry`          | `{ url: string; lastModified?: string \| Date; alternates: { languages: Record<string, string> } }` |
