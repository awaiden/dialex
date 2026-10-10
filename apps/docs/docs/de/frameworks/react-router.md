# React Router

React Router im Framework-Modus (ab v7, früher Remix) rendert auf dem Server, daher muss das Locale bei der Anfrage bestimmt und an den Client weitergegeben werden. Dialex macht das in zwei Teilen: `dialexjs/web` ermittelt das Locale in einem Loader aus einem Standard-`Request`, und `dialexjs/react` rendert die App in diesem Locale. Ein zusätzlicher Adapter ist nicht nötig. Das Projekt `examples/react-router` zeigt es von Anfang bis Ende.

## Installation

Installiere die Laufzeitbibliothek und das CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Einrichten

React Router hält seinen Quellcode in `app/`, sage Dialex daher mit `output`, wohin die generierte Datei geschrieben wird:

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
});
```

Schreibe ein Wörterbuch neben den Code, der es verwendet. Jedes Locale hat dieselben Schlüssel:

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

Kompiliere die Wörterbücher zu `dialex.generated.ts` und den Typdeklarationen. Führe es erneut aus, wenn sich ein Wörterbuch ändert, oder lasse `dx generate --watch` laufen:

```bash
npx dx generate
```

## Das Locale auf dem Server ermitteln

Erzeuge den Anfrage-Handler einmal. Er liest `defaultLocale`, `locales` und `fallbacks` aus der generierten Konfiguration und ermittelt das Locale aus `?lang=`, dann dem Cookie `locale`, dann `Accept-Language`, dann dem Standard. Das Suffix `.server` hält die Datei aus dem Client-Bundle heraus:

```ts
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });
```

## Die App in diesem Locale rendern

Gib das Locale aus dem Wurzel-Loader zurück, setze es auf `<html lang>` und übergib es dem Provider als `initialLocale`, damit das erste Client-Rendering zum HTML des Servers passt:

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

## Wörterbücher in Routen verwenden

In Komponenten verwendest du die Hooks von `dialexjs/react`. In einem Loader oder einer Action nutzt du denselben Handler für den Text, den du auf dem Server brauchst, zum Beispiel den Seitentitel:

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

## Das Locale wechseln

`setLocale` aktualisiert den Provider und schreibt das Cookie `locale`. Revalidiere danach die Loader, damit die serverseitig gerenderten Teile (`<html lang>` und Loader-Text) folgen:

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

## Bewährte Vorgehensweisen

- Ermittle das Locale nur im Wurzel-Loader und lies es in Kindrouten mit `useRouteLoaderData("root")` oder vom Provider. Es in jeder Route erneut zu ermitteln wiederholt Arbeit und kann abweichen.
- Verwende `dialexjs/web` für Text, der auf dem Server entsteht (Titel, E-Mails, Fehlermeldungen), und die React-Hooks für Text in Komponenten. Beide lesen dieselben Wörterbücher.
- Setze `Content-Language` in Antworten mit `applyHeaders` aus dem Ergebnis des Handlers, wenn Suchmaschinen oder Caches nach Sprache unterscheiden sollen.
- Soll die Website pro Sprache indexiert werden, gib jeder Sprache eine eigene URL (`/en/about`, `/tr/about`) mit den [Routing-Helfern](../guide/routing.md), statt sich auf das Cookie zu verlassen.

## Fehlerbehebung

- **`Cannot find module './+types/root'`**: React Router erzeugt seine Routentypen. Führe `react-router typegen` vor der Typprüfung aus (das Skript `typecheck` des Beispiels erledigt das).
- **Die generierte Datei wird nicht gefunden**: Ohne Ordner `src/` schreibt Dialex sie in den Projektstamm. Setze `output: "app/dialex.generated.ts"` in `dialex.config.ts`.
- **Hydration-Abweichung oder Sprachblitzen**: Der Provider wurde ohne `initialLocale` gerendert. Übergib das Locale des Loaders.
- **Die Seite bleibt nach dem Wechsel in der alten Sprache**: Die Loader wurden nicht revalidiert. Rufe nach `setLocale` `revalidate()` auf oder lade die Route neu.
