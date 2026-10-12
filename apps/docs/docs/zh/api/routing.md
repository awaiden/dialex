# 路由

用于带 locale 前缀的 URL、`hreflang` 链接和 sitemap 的纯辅助函数。它们不依赖任何框架，在服务端和客户端都能运行。如何把它们接入应用，参见[路由辅助函数](../guide/routing.md)。

```ts
import { localizePath, stripLocale } from "dialexjs/routing";
```

## `RoutingOptions`

| 选项            | 类型       | 默认值 | 说明                                                                |
| --------------- | ---------- | ------ | ------------------------------------------------------------------- |
| `locales`       | `string[]` | —      | 支持的 locale。必填                                                 |
| `defaultLocale` | `string`   | —      | 路径没有前缀时使用的 locale。部分辅助函数需要它                     |
| `prefixDefault` | `boolean`  | `true` | 默认 locale 是否也带前缀。为 `false` 时它位于无前缀路径（`/about`） |

## `localizePath(path, locale, options)`

```ts
function localizePath(path: string, locale: string, options: RoutingOptions): string;
```

为路径加上 locale 前缀，并替换它已有的 locale 前缀。查询字符串和片段会保留。外部 URL、`mailto:` 链接和单独的 `#fragment` 原样返回。

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

去掉开头的 locale 段。只有与 `locales` 完全匹配（不区分大小写）才算，因此 `/english` 不会被改动。

```ts
stripLocale("/tr/about?x=1", ["en", "tr"]); // { path: "/about?x=1", locale: "tr" }
```

## `localeFromPath(path, options)`

```ts
function localeFromPath(path: string, options: RoutingOptions & { defaultLocale: string }): string;
```

路径所属的 locale，没有前缀时返回 `defaultLocale`。

```ts
localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
```

## `isLocale(value, locales)`

```ts
function isLocale(value: string, locales: string[]): boolean;
```

`value` 是否恰好是 `locales` 之一。

## `alternateLinks(path, options)`

```ts
function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[];
```

为每个 locale 生成一条 `hreflang` 备选链接，并且除非 `xDefault` 为 `false`，还会为默认 locale 生成一条 `x-default`。

| 选项       | 类型      | 默认值 | 说明                                     |
| ---------- | --------- | ------ | ---------------------------------------- |
| `baseUrl`  | `string`  | —      | 用于绝对 URL 的源，`https://example.com` |
| `xDefault` | `boolean` | `true` | 添加一条 `x-default`                     |

它同时接受 `RoutingOptions` 的所有字段。

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

把 `alternateLinks` 的结果表示为 `{ [locale]: url }` 映射，也就是 Next.js `metadata.alternates.languages` 的形状。

## `sitemapEntries(paths, options)`

```ts
function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[];
```

每个路径和 locale 对应一条记录，每条都带 `hreflang` 备选链接，形状与 Next.js 的 `MetadataRoute.Sitemap` 相同。

```ts
// app/sitemap.ts
export default function sitemap() {
  return sitemapEntries(["/", "/about"], {
    locales: ["en", "tr"],
    baseUrl: "https://example.com",
  });
}
```

## 类型

| 类型                    | 定义                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AlternateLink`         | `{ locale: string; href: string }`。默认条目的 `locale` 为 `"x-default"`                            |
| `AlternateLinksOptions` | `RoutingOptions` 加上 `baseUrl` 和 `xDefault`                                                       |
| `SitemapEntry`          | `{ url: string; lastModified?: string \| Date; alternates: { languages: Record<string, string> } }` |
