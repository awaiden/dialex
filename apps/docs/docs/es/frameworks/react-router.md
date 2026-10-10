# React Router

React Router en modo framework (v7 y posteriores, antes Remix) renderiza en el servidor, así que el locale debe decidirse en la petición y entregarse al cliente. Dialex lo hace en dos partes: `dialexjs/web` resuelve el locale desde un `Request` estándar en un loader, y `dialexjs/react` renderiza la aplicación en ese locale. No hace falta ningún adaptador adicional. El proyecto `examples/react-router` lo muestra de principio a fin.

## Instalación

Instala el runtime y la CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Configuración

React Router mantiene su código en `app/`, así que indica a Dialex dónde escribir el archivo generado con `output`:

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
});
```

Escribe un diccionario junto al código que lo usa. Cada locale tiene las mismas claves:

```ts
// app/content/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    greeting: (name: string) => `Hello, ${name}!`,
    items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    greeting: (name: string) => `Merhaba, ${name}!`,
    items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}",
  },
});
```

Compila los diccionarios en `dialex.generated.ts` y las declaraciones de tipos. Ejecútalo de nuevo cuando cambie un diccionario, o deja `dx generate --watch` en marcha:

```bash
npx dx generate
```

## Detectar el locale en el servidor

Crea el manejador de peticiones una vez. Lee `defaultLocale`, `locales` y `fallbacks` de la configuración generada, y encuentra el locale en `?lang=`, luego la cookie `locale`, luego `Accept-Language` y por último el valor por defecto. El sufijo `.server` mantiene el archivo fuera del bundle del cliente:

```ts
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });
```

## Renderizar la aplicación en ese locale

Devuelve el locale desde el loader raíz, ponlo en `<html lang>` y pásalo al provider como `initialLocale` para que el primer render del cliente coincida con el HTML del servidor:

```tsx
// app/root.tsx
import { DialexProvider } from "dialexjs/react";
import { Links, Meta, Outlet, Scripts, useLoaderData, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/root";
import { dialex } from "./dialex.generated";
import { resolveDialex } from "./dialex.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await resolveDialex(request);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Also renders for error pages, where the loader data may be missing.
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang={data?.locale ?? "en"}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  return (
    <DialexProvider {...dialex} initialLocale={locale}>
      <Outlet />
    </DialexProvider>
  );
}
```

## Usar diccionarios en las rutas

En los componentes usa los hooks de `dialexjs/react`. En un loader o una acción, usa el mismo manejador para el texto que necesitas en el servidor, por ejemplo el título de la página:

```tsx
// app/routes/home.tsx
import { useDictionary, useT } from "dialexjs/react";

import { resolveDialex } from "../dialex.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const { getDictionary } = await resolveDialex(request);
  return { title: getDictionary("home").title as string };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData.title }];
}

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count: 3 })}</p>
    </>
  );
}
```

## Cambiar el locale

`setLocale` actualiza el provider y escribe la cookie `locale`. Revalida los loaders después para que las partes renderizadas en el servidor (`<html lang>` y cualquier texto de loader) lo sigan:

```tsx
import { useDialex } from "dialexjs/react";
import { useRevalidator } from "react-router";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const { revalidate } = useRevalidator();

  return (
    <select
      value={locale}
      onChange={(event) => {
        setLocale(event.target.value);
        void revalidate();
      }}
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

## Buenas prácticas

- Resuelve el locale solo en el loader raíz y léelo en las rutas hijas con `useRouteLoaderData("root")` o desde el provider. Resolverlo de nuevo en cada ruta repite trabajo y puede discrepar.
- Usa `dialexjs/web` para el texto producido en el servidor (títulos, correos, mensajes de error) y los hooks de React para el texto renderizado en componentes. Ambos leen los mismos diccionarios.
- Establece `Content-Language` en las respuestas con `applyHeaders` del resultado del manejador cuando los buscadores o cachés deban variar por idioma.
- Si el sitio debe indexarse por idioma, da a cada idioma su propia URL (`/en/about`, `/tr/about`) con los [ayudantes de enrutamiento](../guide/routing.md) en lugar de depender de la cookie.

## Solución de problemas

- **`Cannot find module './+types/root'`**: React Router genera sus tipos de ruta. Ejecuta `react-router typegen` antes de la comprobación de tipos (el script `typecheck` del ejemplo lo hace).
- **No se encuentra el archivo generado**: sin una carpeta `src/`, Dialex lo escribe en la raíz del proyecto. Establece `output: "app/dialex.generated.ts"` en `dialex.config.ts`.
- **Discrepancia de hidratación o parpadeo del idioma**: el provider se renderizó sin `initialLocale`. Pasa el locale del loader.
- **La página sigue en el idioma anterior tras cambiar**: los loaders no se revalidaron. Llama a `revalidate()` después de `setLocale` o recarga la ruta.
