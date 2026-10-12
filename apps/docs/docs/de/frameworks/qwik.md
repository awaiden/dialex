# Qwik

`dialexjs/qwik` bindet Qwik-Hooks an deine Wörterbücher. Qwik serialisiert den Komponentenzustand ins HTML und setzt auf dem Client fort; Wörterbücher enthalten Funktionen, die sich nicht serialisieren lassen, daher bleiben sie in einem eigenen Modul. Nur das aktive Locale, ein String, wandert in die Seite.

## Installation

Installiere die Laufzeitbibliothek und das CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Einrichten

Lege `dialex.config.ts` mit deinen Locales an (oder führe `dialex init` aus, das auch die Pakete und ein Start-Wörterbuch hinzufügt):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Schreibe ein Wörterbuch neben den Code, der es verwendet. Jedes Locale hat dieselben Schlüssel:

```ts
// src/home.content.ts
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

Binde die Hooks einmal in einem Modul und importiere sie von dort:

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

Rufe `useDialexProvider()` im Root-Layout auf:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

import { useDialexProvider } from "../i18n";

export default component$(() => {
  useDialexProvider();
  return <Slot />;
});
```

## Wörterbücher verwenden

`useDictionary(name)` gibt einen Accessor für das Wörterbuch des aktuellen Locale zurück, sodass JSX `home().title` liest, und `useT()` gibt eine Funktion `t("dictionary.key", values?)` zurück. Komponenten, die sie lesen, werden bei Locale-Wechsel neu gerendert:

```tsx
import { component$ } from "@builder.io/qwik";

import { useDictionary, useT } from "../i18n";

export default component$(() => {
  const home = useDictionary("home");
  const t = useT();

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: 2 })}</p>
    </>
  );
});
```

Die Werte werden anhand der ICU-Nachricht typgeprüft, daher muss `count` oben eine Zahl sein.

## Das Locale wechseln

`useDialex()` gibt den Zustand des Providers zurück, und `setLocale(state, locale)` ändert ihn. `setLocale` ist eine einfache Funktion, daher kann ein `onClick$` sie verwenden, ohne etwas Nicht-Serialisierbares einzufangen:

```tsx
import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();

  return (
    <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
});
```

`setLocale` merkt sich die Auswahl im Cookie `locale` und hält `<html lang>` synchron.

## Das Locale auf dem Server ermitteln

Ermittle das Locale aus der Anfrage mit [`dialexjs/web`](./web.md) in einem `routeLoader$` und gib es an den Provider weiter. Das erste Rendering auf dem Server und der fortgesetzte Client stimmen dann überein:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";
import { useDialexProvider } from "../i18n";

const resolveDialex = createDialexHandler({ ...dialex });

export const useLocale = routeLoader$(async ({ request }) => {
  const { locale } = await resolveDialex(request);
  return locale;
});

export default component$(() => {
  const locale = useLocale();
  useDialexProvider({ initialLocale: locale.value });
  return <Slot />;
});
```

## API

`createDialexQwik({ ...dialex })` akzeptiert die generierten `dictionaries`, `config` und `loaders` sowie `persist` (`"cookie"`, `"localStorage"` oder `false`) und `storageKey`. Es gibt Folgendes zurück:

| Export                                 | Beschreibung                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `useDialexProvider({ initialLocale })` | Stellt den Komponenten darunter das Locale bereit. Rufe es einmal im Root-Layout auf                                  |
| `useDialex()`                          | Gibt den Zustand des Providers zurück, `{ locale }`. Lies `locale`; ändere es mit `setLocale`                         |
| `setLocale(state, locale)`             | Ändert das Locale, merkt es sich und hält `<html lang>` synchron                                                      |
| `getPersistedLocale()`                 | Das in diesem Browser gemerkte Locale, wenn die App es unterstützt. Auf dem Server `undefined`                        |
| `useDictionary(name)`                  | Ein Accessor für das Wörterbuch des aktuellen Locale, entlang der Fallback-Kette. Rufe ihn in JSX auf: `home().title` |
| `useT()`                               | Eine Funktion `t("dictionary.key", values?)`, die an das aktuelle Locale gebunden ist                                 |

## Links und Navigation

Wenn Ihre URLs die Locale tragen (`/tr/about`), bauen Sie Links mit `localizePath` aus [Routing-Helfer](../guide/routing.md) und der Locale, die die App gerade zeigt. Dialex liefert keine Link-Komponente für Qwik City: ein paar eigene Zeilen halten `useNavigate()` und Weiterleitungen gleich und zeigen genau, was mit einem Pfad geschieht. Die generierte `config` enthält bereits `locales`, `defaultLocale` und `prefixDefault`, nichts wird wiederholt.

```tsx
import { component$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { localizePath } from "dialexjs/routing";

import { config } from "./dialex.generated";
import { useDialex } from "./i18n";

export const Nav = component$(() => {
  const dialex = useDialex();
  const navigate = useNavigate();
  const localize = (path: string) => localizePath(path, dialex.locale, config);

  return (
    <>
      <Link href={localize("/about")}>About</Link>
      <button onClick$={() => navigate(localizePath("/cart", dialex.locale, config))}>Cart</button>
    </>
  );
});
```

## Bewährte Vorgehensweisen

- Erzeuge die Hooks mit `createDialexQwik` in einem Modul und importiere sie von dort. Rufe `createDialexQwik` nicht in einer Komponente auf, denn die Wörterbücher dürfen nicht Teil des Komponentenzustands sein.
- Lies `useDialex().locale` in der Komponente, die es braucht, nicht im Layout, damit bei einem Wechsel nur diese Komponente neu rendert.
- Übergib `initialLocale` aus einem `routeLoader$` für servergerenderte Seiten, damit ein Besucher mit gemerktem Locale kein kurzes Aufblitzen der Standardsprache sieht.
- Mit Lazy Loading verwendest du `await preloadDictionaries(dialex, "home")` in einem `routeLoader$`, damit das Server-Rendering den Text schon hat. Im Browser werden Komponenten neu gerendert, wenn ein Ladevorgang abgeschlossen ist.
- Rufe den Accessor in JSX auf (`home().title`), statt `home()` einmal in eine Variable zu kopieren. Qwik aktualisiert einfache Property-Zugriffe auf ein kopiertes Objekt bei einem Locale-Wechsel nicht.

## Fehlerbehebung

- **Die Hooks finden den Provider nicht**: Die Komponente wird außerhalb davon gerendert. Rufe `useDialexProvider()` in einem Layout oberhalb der Komponente auf.
- **Qwik meldet einen Wert, der sich nicht serialisieren lässt**: Ein Wörterbuch oder das Ergebnis von `useT()` wurde von einer `$`-Closure eingefangen, zum Beispiel einem `onClick$`. Lies den benötigten Text beim Rendern der Komponente und gib nur einfache Werte in die Closure.
- **Schlüssel werden nicht automatisch vervollständigt**: Führe `dx generate` aus und binde `dialex-env.d.ts` in deine `tsconfig` ein. Die CLI fügt die Deklarationen von `dialexjs/qwik` hinzu, wenn `@builder.io/qwik` in `package.json` steht.
