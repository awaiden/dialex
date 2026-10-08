# Routing Helpers

Framework-agnostic helpers for locale-prefixed URLs, from `dialex/routing`.

```ts
import {
  localizePath,
  stripLocale,
  alternateLinks,
  alternateLanguages,
  sitemapEntries,
} from "dialex/routing";

const options = { locales: ["en", "tr"], defaultLocale: "en" };

localizePath("/about", "tr", options); // "/tr/about"
localizePath("/en/about", "tr", options); // "/tr/about" (an existing prefix is replaced)
stripLocale("/tr/about", ["en", "tr"]); // { path: "/about", locale: "tr" }
```

## `localizePath(path, locale, options)`

Prefixes a path with a locale. Query strings and fragments are kept. External URLs (`https://...`, `//cdn...`), `mailto:` links and bare `#fragments` are returned unchanged.

With `prefixDefault: false` the default locale gets no prefix:

```ts
const asNeeded = { ...options, prefixDefault: false };
localizePath("/about", "en", asNeeded); // "/about"
localizePath("/about", "tr", asNeeded); // "/tr/about"
```

## `stripLocale(path, locales)`

Removes a leading locale segment and tells you which one it was. Only exact, case-insensitive matches count, so `/english/about` is left alone.

## hreflang and sitemaps

```ts
const seo = { ...options, baseUrl: "https://example.com" };

alternateLinks("/about", seo);
// [{ locale: "en", href: "https://example.com/en/about" },
//  { locale: "tr", href: "https://example.com/tr/about" },
//  { locale: "x-default", href: "https://example.com/en/about" }]

alternateLanguages("/about", seo); // { en: "...", tr: "...", "x-default": "..." }
sitemapEntries(["/", "/about"], { ...seo, lastModified: "2024-01-01" });
```

`alternateLanguages` matches the shape of Next.js `metadata.alternates.languages`; `sitemapEntries` returns one entry per path and locale, each with `alternates.languages`, matching `MetadataRoute.Sitemap`. Pass `xDefault: false` to leave out `x-default`.

For Next.js there are also [`createI18nMiddleware` and `I18nLink`](../frameworks/nextjs.md).
