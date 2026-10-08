# 路由辅助函数

来自 `dialex/routing` 的、与框架无关的带 locale 前缀 URL 辅助函数。

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

为路径加上 locale 前缀。查询字符串和片段会被保留。外部 URL（`https://...`、`//cdn...`）、`mailto:` 链接和单独的 `#片段` 会原样返回。

使用 `prefixDefault: false` 时，默认 locale 不带前缀：

```ts
const asNeeded = { ...options, prefixDefault: false };
localizePath("/about", "en", asNeeded); // "/about"
localizePath("/about", "tr", asNeeded); // "/tr/about"
```

## `stripLocale(path, locales)`

移除开头的 locale 段，并告诉你它是哪一个。只有完全匹配（不区分大小写）才算，因此 `/english/about` 不会被改动。

## hreflang 与站点地图

```ts
const seo = { ...options, baseUrl: "https://example.com" };

alternateLinks("/about", seo);
// [{ locale: "en", href: "https://example.com/en/about" },
//  { locale: "tr", href: "https://example.com/tr/about" },
//  { locale: "x-default", href: "https://example.com/en/about" }]

alternateLanguages("/about", seo); // { en: "...", tr: "...", "x-default": "..." }
sitemapEntries(["/", "/about"], { ...seo, lastModified: "2024-01-01" });
```

`alternateLanguages` 的形状与 Next.js 的 `metadata.alternates.languages` 一致；`sitemapEntries` 为每个路径和 locale 返回一个条目，每个条目都带有 `alternates.languages`，与 `MetadataRoute.Sitemap` 匹配。传入 `xDefault: false` 可省略 `x-default`。

对于 Next.js，还有 [`createI18nMiddleware` 和 `I18nLink`](../frameworks/nextjs.md)。
