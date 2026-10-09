# URL & Locale Routing Reference

Dialex supports both path-based routing (e.g. `/en/about`, `/tr/about`) and header/cookie-based locale negotiation.

## Path Extraction

In Next.js App Router:

```
app/
  [locale]/
    layout.tsx
    page.tsx
```

In `page.tsx`:

```tsx
import { getDictionary } from "../../dialex"; // createDialexServer(dialex)

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary("home", locale);
  return <h1>{dict.title}</h1>;
}
```

## Static Params Generation

```tsx
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "tr" }, { locale: "de" }];
}
```

## Middleware Header & Cookie Negotiation

In Express or Hono, Dialex inspects:

1. Custom route prefix / query param (e.g. `?lang=tr`)
2. Cookie (e.g. `dialex_locale`)
3. `Accept-Language` header
4. Falls back to `defaultLocale`
