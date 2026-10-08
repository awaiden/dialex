# Next.js

## Konfiguration

```ts
// next.config.mjs
import { withI18n } from "dialex/next";

export default withI18n({
  // your Next.js config
});
```

`withI18n(nextConfig, inlineConfig?)` bindet die Wörterbuchauflösung in webpack und Turbopack ein, behält deine bestehende `webpack`-Funktion bei und synchronisiert generierte Dateien.

## Middleware

`createI18nMiddleware` hält jede Seite unter einem Locale-Präfix:

```ts
// middleware.ts
import { createI18nMiddleware } from "dialex/next/middleware";

export default createI18nMiddleware({
  locales: ["en", "tr"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

- `/about` wird auf `/tr/about` umgeleitet. Das Locale stammt aus dem Cookie `locale`, dann aus `?locale=` / `?lang=`, dann aus `Accept-Language`, dann aus `defaultLocale`.
- Ein Pfad, der bereits ein Locale hat, wird durchgelassen, und das Locale wird im Cookie `locale` gespeichert.
- `/_next`, `/api` und alles mit Dateiendung werden zusätzlich zu deinem `matcher` übersprungen.

| Option                             | Standard             | Beschreibung                                                                                                                                                   |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales`                          | erforderlich         | Unterstützte Locales                                                                                                                                           |
| `defaultLocale`                    | erstes von `locales` | Wird verwendet, wenn nichts anderes entscheidet                                                                                                                |
| `prefixDefault`                    | `true`               | Bei `false` liegt das Standard-Locale am Pfad ohne Präfix (`/about`); intern wird es auf `/en/about` umgeschrieben, und `/en/about` leitet zurück auf `/about` |
| `cookieName`                       | `"locale"`           | Cookie, der die Wahl speichert                                                                                                                                 |
| `setCookie`                        | `true`               | Schreibt den Cookie, wenn sich das Locale der URL vom gespeicherten unterscheidet                                                                              |
| `ignore`                           | siehe oben           | `(pathname) => boolean` für zusätzliche Pfade, die übersprungen werden                                                                                         |
| `queryKeys`, `headerKey`, `custom` |                      | Wie bei der [Locale-Erkennung](../guide/locale-detection.md#options)                                                                                           |

Die Middleware läuft am Edge und kann `dialex.config.ts` nicht lesen. Übergib `locales` und `prefixDefault` daher explizit und halte sie gleich den Werten in der Konfiguration, die `I18nLink` liest.

## Links

`I18nLink` ist `next/link`, das das aktuelle Locale in der URL behält. Es übernimmt das Locale aus dem Routenparameter `[locale]`:

```tsx
import { I18nLink } from "dialex/next/link";

<I18nLink href="/about">About</I18nLink>; // /tr/about while viewing /tr/...
<I18nLink href="/about" locale="en">
  English
</I18nLink>; // /en/about
```

Es liest `locales`, `defaultLocale` und `prefixDefault` aus `dialex.config.ts`. Externe URLs und `#Fragmente` bleiben unberührt. Siehe auch die [Routing-Helfer](../guide/routing.md).

## Server Components

```tsx
// src/app/[locale]/page.tsx
import { getDictionary } from "dialex/server";

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

`getDictionary(name, locale?)` fällt entlang der [Fallback-Kette](../guide/fallbacks.md) zurück, wenn `locale` fehlt oder im Wörterbuch nicht vorhanden ist, und protokolliert eine Warnung, wenn ein Wörterbuch nicht gefunden wird.

## SEO: hreflang und Sitemap

```tsx
import { alternateLanguages, sitemapEntries } from "dialex/routing";

const routing = { locales: ["en", "tr"], defaultLocale: "en", baseUrl: "https://example.com" };

// app/[locale]/about/page.tsx
export const generateMetadata = () => ({
  alternates: { languages: alternateLanguages("/about", routing) },
});

// app/sitemap.ts
export default () => sitemapEntries(["/", "/about"], routing);
```
