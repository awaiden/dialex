# Helpers de enrutamiento

Helpers independientes del framework para URLs con prefijo de locale, desde `dialexjs/routing`.

```ts
import {
  localizePath,
  stripLocale,
  alternateLinks,
  alternateLanguages,
  sitemapEntries,
} from "dialexjs/routing";

const options = { locales: ["en", "tr"], defaultLocale: "en" };

localizePath("/about", "tr", options); // "/tr/about"
localizePath("/en/about", "tr", options); // "/tr/about" (an existing prefix is replaced)
stripLocale("/tr/about", ["en", "tr"]); // { path: "/about", locale: "tr" }
```

## `localizePath(path, locale, options)`

Añade un prefijo de locale a una ruta. Se conservan las cadenas de consulta y los fragmentos. Las URL externas (`https://...`, `//cdn...`), los enlaces `mailto:` y los `#fragmentos` sueltos se devuelven sin cambios.

Con `prefixDefault: false`, el locale por defecto no lleva prefijo:

```ts
const asNeeded = { ...options, prefixDefault: false };
localizePath("/about", "en", asNeeded); // "/about"
localizePath("/about", "tr", asNeeded); // "/tr/about"
```

## `stripLocale(path, locales)`

Elimina el segmento de locale inicial y te indica cuál era. Solo cuentan las coincidencias exactas, sin distinguir mayúsculas de minúsculas, por lo que `/english/about` se deja intacto.

## `localeFromPath(path, options)` and `isLocale(value, locales)`

`localeFromPath` devuelve el idioma bajo el que está una ruta, o `defaultLocale` cuando no tiene prefijo. `isLocale` comprueba una cadena (por ejemplo, un parámetro de ruta) frente a tus idiomas admitidos.

```ts
localeFromPath("/tr/about", options); // "tr"
localeFromPath("/about", options); // "en"
isLocale("tr", options.locales); // true
```

## hreflang y sitemaps

```ts
const seo = { ...options, baseUrl: "https://example.com" };

alternateLinks("/about", seo);
// [{ locale: "en", href: "https://example.com/en/about" },
//  { locale: "tr", href: "https://example.com/tr/about" },
//  { locale: "x-default", href: "https://example.com/en/about" }]

alternateLanguages("/about", seo); // { en: "...", tr: "...", "x-default": "..." }
sitemapEntries(["/", "/about"], { ...seo, lastModified: "2024-01-01" });
```

`alternateLanguages` tiene la misma forma que `metadata.alternates.languages` de Next.js; `sitemapEntries` devuelve una entrada por ruta y locale, cada una con `alternates.languages`, compatible con `MetadataRoute.Sitemap`. Pasa `xDefault: false` para omitir `x-default`.

Para Next.js también existen [`createDialexMiddleware` e `DialexLink`](../frameworks/nextjs.md).
