# Next.js

## Config

```ts
// next.config.mjs
import { withI18n } from "dialexjs/next";

export default withI18n({
  // your Next.js config
});
```

`withI18n(nextConfig, inlineConfig?)` wires dictionary resolution into webpack and Turbopack, keeps your existing `webpack` function, and syncs generated files.

## Middleware

`createI18nMiddleware` keeps every page under a locale prefix:

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

- `/about` redirects to `/tr/about`. The locale comes from the `locale` cookie, then `?locale=` / `?lang=`, then `Accept-Language`, then `defaultLocale`.
- A path that already has a locale passes through, and the locale is remembered in the `locale` cookie.
- `/_next`, `/api` and anything with a file extension are skipped, in addition to your `matcher`.

| Option                             | Default            | Description                                                                                                                                                     |
| ---------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales`                          | required           | Supported locales                                                                                                                                               |
| `defaultLocale`                    | first of `locales` | Used when nothing else decides                                                                                                                                  |
| `prefixDefault`                    | `true`             | When `false`, the default locale lives at the unprefixed path (`/about`); it is rewritten to `/en/about` internally, and `/en/about` redirects back to `/about` |
| `cookieName`                       | `"locale"`         | Cookie that remembers the choice                                                                                                                                |
| `setCookie`                        | `true`             | Write the cookie when the URL's locale differs from it                                                                                                          |
| `ignore`                           | see above          | `(pathname) => boolean` for extra paths to skip                                                                                                                 |
| `queryKeys`, `headerKey`, `custom` |                    | Same as [locale detection](../guide/locale-detection.md#options)                                                                                                |

The middleware runs on the edge and cannot read `dialex.config.ts`, so pass `locales` and `prefixDefault` explicitly, and keep them equal to the values in the config that `I18nLink` reads.

## Links

`I18nLink` is `next/link` that keeps the current locale in the URL. It takes the locale from the `[locale]` route param:

```tsx
import { I18nLink } from "dialexjs/next/link";

<I18nLink href="/about">About</I18nLink>; // /tr/about while viewing /tr/...
<I18nLink href="/about" locale="en">
  English
</I18nLink>; // /en/about
```

It reads `locales`, `defaultLocale` and `prefixDefault` from `dialex.config.ts`. External URLs and `#fragments` are left alone. See also [Routing helpers](../guide/routing.md).

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

`getDictionary(name, locale?)` falls back along the [fallback chain](../guide/fallbacks.md) when `locale` is omitted or missing from the dictionary, and logs a warning when a dictionary is not found.

## SEO: hreflang and sitemap

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
