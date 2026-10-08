# Routing-Helfer

Frameworkunabhängige Helfer für URLs mit Locale-Präfix, aus `dialex/routing`.

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

Stellt einem Pfad ein Locale voran. Query-Strings und Fragmente bleiben erhalten. Externe URLs (`https://...`, `//cdn...`), `mailto:`-Links und reine `#Fragmente` werden unverändert zurückgegeben.

Mit `prefixDefault: false` erhält das Standard-Locale kein Präfix:

```ts
const asNeeded = { ...options, prefixDefault: false };
localizePath("/about", "en", asNeeded); // "/about"
localizePath("/about", "tr", asNeeded); // "/tr/about"
```

## `stripLocale(path, locales)`

Entfernt ein führendes Locale-Segment und teilt dir mit, welches es war. Es zählen nur exakte Übereinstimmungen ohne Beachtung der Groß- und Kleinschreibung, daher bleibt `/english/about` unangetastet.

## hreflang und Sitemaps

```ts
const seo = { ...options, baseUrl: "https://example.com" };

alternateLinks("/about", seo);
// [{ locale: "en", href: "https://example.com/en/about" },
//  { locale: "tr", href: "https://example.com/tr/about" },
//  { locale: "x-default", href: "https://example.com/en/about" }]

alternateLanguages("/about", seo); // { en: "...", tr: "...", "x-default": "..." }
sitemapEntries(["/", "/about"], { ...seo, lastModified: "2024-01-01" });
```

`alternateLanguages` entspricht der Form von `metadata.alternates.languages` in Next.js; `sitemapEntries` liefert einen Eintrag pro Pfad und Locale, jeweils mit `alternates.languages`, passend zu `MetadataRoute.Sitemap`. Übergib `xDefault: false`, um `x-default` wegzulassen.

Für Next.js gibt es außerdem [`createI18nMiddleware` und `I18nLink`](../frameworks/nextjs.md).
