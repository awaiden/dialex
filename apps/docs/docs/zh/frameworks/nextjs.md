# Next.js

## 配置

```ts
// next.config.mjs
import { withI18n } from "dialexjs/next";

export default withI18n({
  // your Next.js config
});
```

`withI18n(nextConfig, inlineConfig?)` 会把词典解析接入 webpack 和 Turbopack，保留你已有的 `webpack` 函数，并同步生成的文件。

## 中间件

`createI18nMiddleware` 让每个页面都位于 locale 前缀之下：

```ts
// middleware.ts
import { createI18nMiddleware } from "dialexjs/next/middleware";

export default createI18nMiddleware({
  locales: ["en", "tr"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

- `/about` 会重定向到 `/tr/about`。locale 依次来自 `locale` Cookie、`?locale=` / `?lang=`、`Accept-Language`，最后是 `defaultLocale`。
- 已经带有 locale 的路径会直接放行，并且该 locale 会记录在 `locale` Cookie 中。
- 除了你的 `matcher` 之外，`/_next`、`/api` 以及任何带文件扩展名的路径都会被跳过。

| 选项                               | 默认值             | 说明                                                                                                                    |
| ---------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `locales`                          | 必填               | 受支持的 locale                                                                                                         |
| `defaultLocale`                    | `locales` 的第一个 | 在没有其他依据时使用                                                                                                    |
| `prefixDefault`                    | `true`             | 为 `false` 时，默认 locale 位于不带前缀的路径（`/about`）；内部会重写为 `/en/about`，而 `/en/about` 会重定向回 `/about` |
| `cookieName`                       | `"locale"`         | 记住选择的 Cookie                                                                                                       |
| `setCookie`                        | `true`             | 当 URL 的 locale 与 Cookie 中的不同时写入 Cookie                                                                        |
| `ignore`                           | 见上文             | `(pathname) => boolean`，用于额外要跳过的路径                                                                           |
| `queryKeys`、`headerKey`、`custom` |                    | 与 [locale 检测](../guide/locale-detection.md#options)相同                                                              |

中间件运行在 edge 上，无法读取 `dialex.config.ts`，因此请显式传入 `locales` 和 `prefixDefault`，并让它们与 `I18nLink` 读取的配置中的值保持一致。

## 链接

`I18nLink` 是会在 URL 中保留当前 locale 的 `next/link`。它从 `[locale]` 路由参数中获取 locale：

```tsx
import { I18nLink } from "dialexjs/next/link";

<I18nLink href="/about">About</I18nLink>; // /tr/about while viewing /tr/...
<I18nLink href="/about" locale="en">
  English
</I18nLink>; // /en/about
```

它从 `dialex.config.ts` 读取 `locales`、`defaultLocale` 和 `prefixDefault`。外部 URL 和 `#片段` 保持不变。另请参见[路由辅助函数](../guide/routing.md)。

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

当省略 `locale` 或词典中没有该 locale 时，`getDictionary(name, locale?)` 会沿着[回退链](../guide/fallbacks.md)查找，并在找不到词典时记录一条警告。

## SEO：hreflang 与站点地图

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
