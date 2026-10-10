# Next.js

## Setup

Next.js needs no config wrapper or plugin. `dx generate` writes `src/dialex.generated.ts`. Bind it once for server code:

```ts
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);
```

Then render the provider from a client file that imports the generated file itself. Dictionaries contain functions, which cannot be passed from a Server Component to a Client Component:

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

Keep the file current with `dx generate --watch` next to `next dev`, or with the VS Code extension; `dx check` fails when it is out of date.

## Middleware

`createDialexMiddleware` keeps every page under a locale prefix:

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

The middleware runs on the edge and cannot read `dialex.config.ts`, so pass `locales` and `prefixDefault` explicitly, and keep them equal to the values in the config that `DialexLink` reads.

## Links

`DialexLink` is `next/link` that keeps the current locale in the URL. It takes the locale from the `[locale]` route param:

```tsx
import { DialexLink } from "dialexjs/next/link";

<DialexLink href="/about">About</DialexLink>; // /tr/about while viewing /tr/...
<DialexLink href="/about" locale="en">
  English
</DialexLink>; // /en/about
```

It reads `locales`, `defaultLocale` and `prefixDefault` from the generated config, so render it inside `<DialexProvider {...dialex}>`. External URLs and `#fragments` are left alone. See also [Routing helpers](../guide/routing.md).

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

## Best practices

- Use the middleware for the locale prefix, server components with `createDialexServer` for text, and `DialexProvider` only around client components that need it, with `initialLocale` taken from the route.
- Export `generateStaticParams` with your `locales` so every language is prerendered, and set `<html lang={locale}>` in the root `[locale]/layout.tsx`.
- Keep server components free of the provider. Importing `dialex.generated.ts` into a client component sends every dictionary to the browser, so enable [lazy loading](../guide/lazy-loading.md) when that gets large.

## Troubleshooting

- **A redirect loop on every request**: the middleware `matcher` includes paths it then redirects again (static files, `/api`). Use the matcher from this page, which skips `_next`, `api` and files with an extension.
- **A server component shows the default language**: the locale was not passed. Read `params` in the page and give it to `getDictionary(name, locale)`.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
