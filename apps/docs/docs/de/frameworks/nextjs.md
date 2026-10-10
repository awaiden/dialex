# Next.js

## Einrichtung

Next.js braucht weder einen Config-Wrapper noch ein Plugin. `dx generate` schreibt `src/dialex.generated.ts`. Binde es einmal für Servercode ein:

```ts
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);
```

Rendere den Provider dann aus einer Client-Datei, die die generierte Datei selbst importiert. Wörterbücher enthalten Funktionen, die sich nicht von einer Server Component an eine Client Component übergeben lassen:

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

Halte die Datei mit `dx generate --watch` neben `next dev` oder mit der VS-Code-Erweiterung aktuell; `dx check` schlägt fehl, wenn sie veraltet ist.

## Middleware

`createDialexMiddleware` hält jede Seite unter einem Locale-Präfix:

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

Die Middleware läuft am Edge und kann `dialex.config.ts` nicht lesen. Übergib `locales` und `prefixDefault` daher explizit und halte sie gleich den Werten in der Konfiguration, die `DialexLink` liest.

## Links

`DialexLink` ist `next/link`, das das aktuelle Locale in der URL behält. Es übernimmt das Locale aus dem Routenparameter `[locale]`:

```tsx
import { DialexLink } from "dialexjs/next/link";

<DialexLink href="/about">About</DialexLink>; // /tr/about while viewing /tr/...
<DialexLink href="/about" locale="en">
  English
</DialexLink>; // /en/about
```

Es liest `locales`, `defaultLocale` und `prefixDefault` aus der generierten Konfiguration, rendere es also innerhalb von `<DialexProvider {...dialex}>`. Externe URLs und `#Fragmente` bleiben unberührt. Siehe auch die [Routing-Helfer](../guide/routing.md).

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

`getDictionary(name, locale?)` fällt entlang der [Fallback-Kette](../guide/fallbacks.md) zurück, wenn `locale` fehlt oder im Wörterbuch nicht vorhanden ist, und protokolliert eine Warnung, wenn ein Wörterbuch nicht gefunden wird.

## SEO: hreflang und Sitemap

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

## Bewährte Vorgehensweisen

- Nutze die Middleware für das Locale-Präfix, Server-Komponenten mit `createDialexServer` für Text und `DialexProvider` nur um Client-Komponenten, die es brauchen, mit `initialLocale` aus der Route.
- Exportiere `generateStaticParams` mit deinen `locales`, damit jede Sprache vorgerendert wird, und setze `<html lang={locale}>` im Wurzel-`[locale]/layout.tsx`.
- Halte Server-Komponenten frei vom Provider. Das Importieren von `dialex.generated.ts` in eine Client-Komponente sendet jedes Wörterbuch an den Browser, aktiviere daher [Lazy Loading](../guide/lazy-loading.md), wenn das groß wird.

## Fehlerbehebung

- **Eine Weiterleitungsschleife bei jeder Anfrage**: Der `matcher` der Middleware enthält Pfade, die sie erneut weiterleitet (statische Dateien, `/api`). Nutze den Matcher dieser Seite, der `_next`, `api` und Dateien mit Endung auslässt.
- **Eine Server-Komponente zeigt die Standardsprache**: Das Locale wurde nicht übergeben. Lies `params` in der Seite und gib es an `getDictionary(name, locale)` weiter.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
