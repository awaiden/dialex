# Next.js

## 设置

Next.js 不需要配置包装器或插件。`dx generate` 会写出 `src/dialex.generated.ts`。为服务端代码绑定一次：

```ts
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);
```

然后在一个自行导入生成文件的客户端文件中渲染 provider。词典包含函数，无法从 Server Component 传给 Client Component：

```tsx
// src/components/providers.tsx
"use client";

import { DialexProvider } from "dialexjs/react";

import { dialex } from "../dialex.generated";

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <DialexProvider {...dialex} defaultLocale={locale}>
      {children}
    </DialexProvider>
  );
}
```

用 `dx generate --watch`（与 `next dev` 一起运行）或 VS Code 扩展让文件保持最新；文件过期时 `dx check` 会失败。

## 中间件

`createDialexMiddleware` 让每个页面都位于 locale 前缀之下：

```ts
// proxy.ts (named middleware.ts before Next.js 16)
import { createDialexMiddleware } from "dialexjs/next/middleware";

export default createDialexMiddleware({
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

中间件运行在 edge 上，无法读取 `dialex.config.ts`，因此请显式传入 `locales` 和 `prefixDefault`，并让它们与 `DialexLink` 读取的配置中的值保持一致。

## 链接

`DialexLink` 是会在 URL 中保留当前 locale 的 `next/link`。它从 `[locale]` 路由参数中获取 locale：

```tsx
import { DialexLink } from "dialexjs/next/link";

<DialexLink href="/about">About</DialexLink>; // /tr/about while viewing /tr/...
<DialexLink href="/about" locale="en">
  English
</DialexLink>; // /en/about
```

它从生成的配置读取 `locales`、`defaultLocale` 和 `prefixDefault`，因此请在 `<DialexProvider {...dialex}>` 内渲染它。外部 URL 和 `#片段` 保持不变。另请参见[路由辅助函数](../guide/routing.md)。

## Server Components

```tsx
// src/app/[locale]/page.tsx
import { getDictionary } from "../../dialex";

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
