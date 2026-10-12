# Routing

Reine Helfer für URLs mit Locale-Präfix, `hreflang`-Links und Sitemaps. Sie haben keine Framework-Abhängigkeit und laufen auf Server und Client. Wie du sie in eine App einbindest, steht unter [Routing-Helfer](../guide/routing.md).

```ts
import { localizePath, stripLocale } from "dialexjs/routing";
```

## `RoutingOptions`

| Option          | Typ        | Standard | Beschreibung                                                                                         |
| --------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `locales`       | `string[]` | —        | Unterstützte Locales. Erforderlich                                                                   |
| `defaultLocale` | `string`   | —        | Locale, wenn ein Pfad kein Präfix hat. Einige Helfer brauchen sie                                    |
| `prefixDefault` | `boolean`  | `true`   | Ob auch die Standard-Locale ein Präfix bekommt. Bei `false` liegt sie am Pfad ohne Präfix (`/about`) |

## `localizePath(path, locale, options)`

```ts
function localizePath(path: string, locale: string, options: RoutingOptions): string;
```

Setzt einem Pfad eine Locale voran und ersetzt ein vorhandenes Locale-Präfix. Query-Strings und Fragmente bleiben erhalten. Externe URLs, `mailto:`-Links und reine `#fragments` werden unverändert zurückgegeben.

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

Entfernt ein führendes Locale-Segment. Nur ein exakter Treffer aus `locales` ohne Beachtung der Groß-/Kleinschreibung zählt, daher bleibt `/english` unangetastet.

```ts
stripLocale("/tr/about?x=1", ["en", "tr"]); // { path: "/about?x=1", locale: "tr" }
```

## `localeFromPath(path, options)`

```ts
function localeFromPath(path: string, options: RoutingOptions & { defaultLocale: string }): string;
```

Die Locale, unter der ein Pfad liegt, oder `defaultLocale`, wenn er kein Präfix hat.

```ts
localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
```

## `isLocale(value, locales)`

```ts
function isLocale(value: string, locales: string[]): boolean;
```

Ob `value` genau eine der `locales` ist.

## `alternateLinks(path, options)`

```ts
function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[];
```

Baut je Locale eine `hreflang`-Alternative und, sofern `xDefault` nicht `false` ist, einen `x-default`-Eintrag für die Standard-Locale.

| Option     | Typ       | Standard | Beschreibung                                    |
| ---------- | --------- | -------- | ----------------------------------------------- |
| `baseUrl`  | `string`  | —        | Origin für absolute URLs, `https://example.com` |
| `xDefault` | `boolean` | `true`   | Einen `x-default`-Eintrag hinzufügen            |

Alle Felder von `RoutingOptions` werden ebenfalls akzeptiert.

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

`alternateLinks` als Map `{ [locale]: url }`, die Form von Next.js `metadata.alternates.languages`.

## `sitemapEntries(paths, options)`

```ts
function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[];
```

Ein Eintrag je Pfad und Locale, jeweils mit seinen `hreflang`-Alternativen, in der Form von Next.js `MetadataRoute.Sitemap`.

```ts
// app/sitemap.ts
export default function sitemap() {
  return sitemapEntries(["/", "/about"], {
    locales: ["en", "tr"],
    baseUrl: "https://example.com",
  });
}
```

## Typen

| Typ                     | Definition                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AlternateLink`         | `{ locale: string; href: string }`. `locale` ist `"x-default"` für den Standard-Eintrag             |
| `AlternateLinksOptions` | `RoutingOptions` plus `baseUrl` und `xDefault`                                                      |
| `SitemapEntry`          | `{ url: string; lastModified?: string \| Date; alternates: { languages: Record<string, string> } }` |
