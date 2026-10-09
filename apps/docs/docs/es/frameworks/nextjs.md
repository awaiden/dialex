# Next.js

## Configuración

Next.js no necesita un wrapper de configuración ni un plugin. `dx generate` escribe `src/dialex.generated.ts`. Enlázalo una vez para el código del servidor:

```ts
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";
import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);
```

Después renderiza el provider desde un archivo de cliente que importe el propio archivo generado. Los diccionarios contienen funciones, que no se pueden pasar de un Server Component a un Client Component:

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

Mantén el archivo al día con `dx generate --watch` junto a `next dev`, o con la extensión de VS Code; `dx check` falla cuando está desactualizado.

## Middleware

`createDialexMiddleware` mantiene cada página bajo un prefijo de locale:

```ts
// middleware.ts
import { createDialexMiddleware } from "dialexjs/next/middleware";

export default createDialexMiddleware({
  locales: ["en", "tr"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

- `/about` redirige a `/tr/about`. El locale proviene de la cookie `locale`, después de `?locale=` / `?lang=`, después de `Accept-Language` y, por último, de `defaultLocale`.
- Una ruta que ya tiene un locale pasa sin cambios, y el locale se recuerda en la cookie `locale`.
- Se omiten `/_next`, `/api` y cualquier cosa con extensión de archivo, además de tu `matcher`.

| Opción                             | Valor por defecto       | Descripción                                                                                                                                                    |
| ---------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales`                          | obligatorio             | Locales compatibles                                                                                                                                            |
| `defaultLocale`                    | el primero de `locales` | Se usa cuando nada más decide                                                                                                                                  |
| `prefixDefault`                    | `true`                  | Con `false`, el locale por defecto vive en la ruta sin prefijo (`/about`); internamente se reescribe a `/en/about`, y `/en/about` redirige de nuevo a `/about` |
| `cookieName`                       | `"locale"`              | Cookie que recuerda la elección                                                                                                                                |
| `setCookie`                        | `true`                  | Escribe la cookie cuando el locale de la URL difiere del almacenado                                                                                            |
| `ignore`                           | ver arriba              | `(pathname) => boolean` para rutas adicionales que omitir                                                                                                      |
| `queryKeys`, `headerKey`, `custom` |                         | Igual que en la [detección de locale](../guide/locale-detection.md#options)                                                                                    |

El middleware se ejecuta en el edge y no puede leer `dialex.config.ts`, así que pasa `locales` y `prefixDefault` de forma explícita y mantenlos iguales a los valores de la configuración que lee `DialexLink`.

## Enlaces

`DialexLink` es `next/link` y mantiene el locale actual en la URL. Toma el locale del parámetro de ruta `[locale]`:

```tsx
import { DialexLink } from "dialexjs/next/link";

<DialexLink href="/about">About</DialexLink>; // /tr/about while viewing /tr/...
<DialexLink href="/about" locale="en">
  English
</DialexLink>; // /en/about
```

Lee `locales`, `defaultLocale` y `prefixDefault` de la configuración generada, así que renderízalo dentro de `<DialexProvider {...dialex}>`. Las URL externas y los `#fragmentos` se dejan intactos. Consulta también los [helpers de enrutamiento](../guide/routing.md).

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

`getDictionary(name, locale?)` recurre a la [cadena de fallback](../guide/fallbacks.md) cuando se omite `locale` o falta en el diccionario, y registra una advertencia cuando no se encuentra un diccionario.

## SEO: hreflang y sitemap

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
