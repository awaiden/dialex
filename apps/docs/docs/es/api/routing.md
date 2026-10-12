# Enrutamiento

Ayudantes puros para URL con prefijo de locale, enlaces `hreflang` y sitemaps. No dependen de ningún framework y funcionan en servidor y cliente. Cómo conectarlos a una app está en [Ayudantes de enrutamiento](../guide/routing.md).

```ts
import { localizePath, stripLocale } from "dialexjs/routing";
```

## `RoutingOptions`

| Opción          | Tipo       | Por defecto | Descripción                                                                                         |
| --------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `locales`       | `string[]` | —           | Locales admitidos. Obligatorio                                                                      |
| `defaultLocale` | `string`   | —           | Locale usado cuando una ruta no tiene prefijo. Algunos ayudantes lo necesitan                       |
| `prefixDefault` | `boolean`  | `true`      | Si el locale por defecto también recibe prefijo. Con `false` vive en la ruta sin prefijo (`/about`) |

## `localizePath(path, locale, options)`

```ts
function localizePath(path: string, locale: string, options: RoutingOptions): string;
```

Antepone un locale a una ruta y sustituye el prefijo de locale que ya tenga. Se conservan las cadenas de consulta y los fragmentos. Las URL externas, los enlaces `mailto:` y los `#fragmentos` sueltos se devuelven sin cambios.

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

Quita un segmento de locale inicial. Solo cuenta una coincidencia exacta, sin distinguir mayúsculas, con `locales`, así que `/english` se deja como está.

```ts
stripLocale("/tr/about?x=1", ["en", "tr"]); // { path: "/about?x=1", locale: "tr" }
```

## `localeFromPath(path, options)`

```ts
function localeFromPath(path: string, options: RoutingOptions & { defaultLocale: string }): string;
```

El locale bajo el que está una ruta, o `defaultLocale` cuando no tiene prefijo.

```ts
localeFromPath("/tr/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "tr"
localeFromPath("/about", { locales: ["en", "tr"], defaultLocale: "en" }); // "en"
```

## `isLocale(value, locales)`

```ts
function isLocale(value: string, locales: string[]): boolean;
```

Si `value` es exactamente uno de `locales`.

## `alternateLinks(path, options)`

```ts
function alternateLinks(path: string, options: AlternateLinksOptions): AlternateLink[];
```

Construye una alternativa `hreflang` por locale y, salvo que `xDefault` sea `false`, una entrada `x-default` para el locale por defecto.

| Opción     | Tipo      | Por defecto | Descripción                                            |
| ---------- | --------- | ----------- | ------------------------------------------------------ |
| `baseUrl`  | `string`  | —           | Origen usado para URL absolutas, `https://example.com` |
| `xDefault` | `boolean` | `true`      | Añade una entrada `x-default`                          |

También acepta todos los campos de `RoutingOptions`.

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

`alternateLinks` como mapa `{ [locale]: url }`, la forma de `metadata.alternates.languages` de Next.js.

## `sitemapEntries(paths, options)`

```ts
function sitemapEntries(
  paths: string[],
  options: AlternateLinksOptions & { lastModified?: string | Date },
): SitemapEntry[];
```

Una entrada por ruta y locale, cada una con sus alternativas `hreflang`, con la forma de `MetadataRoute.Sitemap` de Next.js.

```ts
// app/sitemap.ts
export default function sitemap() {
  return sitemapEntries(["/", "/about"], {
    locales: ["en", "tr"],
    baseUrl: "https://example.com",
  });
}
```

## Tipos

| Tipo                    | Definición                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `AlternateLink`         | `{ locale: string; href: string }`. `locale` es `"x-default"` para la entrada por defecto           |
| `AlternateLinksOptions` | `RoutingOptions` más `baseUrl` y `xDefault`                                                         |
| `SitemapEntry`          | `{ url: string; lastModified?: string \| Date; alternates: { languages: Record<string, string> } }` |
