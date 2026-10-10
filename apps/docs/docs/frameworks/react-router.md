# React Router

React Router in framework mode (v7 and later, formerly Remix) renders on the server, so the locale has to be decided on the request and handed to the client. Dialex does this with two parts: `dialexjs/web` resolves the locale from a standard `Request` in a loader, and `dialexjs/react` renders the app in that locale. No extra adapter is needed. The `examples/react-router` project shows it end to end.

## Install

Install the runtime and the CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Set up

React Router keeps its source in `app/`, so tell Dialex where to write the generated file with `output`:

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
});
```

Write a dictionary next to the code that uses it. Every locale has the same keys:

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

Compile the dictionaries into `dialex.generated.ts` and the type declarations. Run it again when a dictionary changes, or keep `dx generate --watch` running:

```bash
npx dx generate
```

## Detect the locale on the server

Create the request handler once. It reads `defaultLocale`, `locales` and `fallbacks` from the generated config, and finds the locale from `?lang=`, then the `locale` cookie, then `Accept-Language`, then the default. The `.server` suffix keeps the file out of the client bundle:

```ts
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });
```

## Render the app in that locale

Return the locale from the root loader, put it on `<html lang>`, and give it to the provider as `initialLocale` so the client's first render matches the server's HTML:

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

## Use dictionaries in routes

In components use the hooks of `dialexjs/react`. In a loader or an action, use the same handler for the text you need on the server, for example the page title:

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

## Switch the locale

`setLocale` updates the provider and writes the `locale` cookie. Revalidate the loaders afterwards so the server-rendered parts (the `<html lang>` and any loader text) follow:

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

## Best practices

- Resolve the locale in the root loader only, and read it in child routes with `useRouteLoaderData("root")` or from the provider. Resolving it again in every route repeats work and can disagree.
- Use `dialexjs/web` for text produced on the server (titles, emails, error messages) and the React hooks for text rendered in components. Both read the same dictionaries.
- Set `Content-Language` on responses with `applyHeaders` from the handler's result when search engines or caches should vary by language.
- If the site must be indexed per language, give each language its own URL (`/en/about`, `/tr/about`) with the [routing helpers](../guide/routing.md) instead of relying on the cookie.

## Troubleshooting

- **`Cannot find module './+types/root'`**: React Router generates its route types. Run `react-router typegen` (the `typecheck` script of the example does it) before the type check.
- **The generated file is not found**: without a `src/` folder Dialex writes it to the project root. Set `output: "app/dialex.generated.ts"` in `dialex.config.ts`.
- **Hydration mismatch or a language flash**: the provider was rendered without `initialLocale`. Pass the loader's locale.
- **The page stays in the old language after switching**: the loaders were not revalidated. Call `revalidate()` after `setLocale`, or reload the route.
