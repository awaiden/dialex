# Preact

`dialexjs/preact` stellt einen Context-Provider und Hooks für Preact 10 und neuer bereit. Es braucht `preact/compat` nicht und funktioniert daher in Apps, die die reine Preact-API verwenden.

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

Umschließe die App mit `DialexProvider` und übergib den generierten `dialex`-Export per Spread:

```tsx
// src/index.tsx
import { DialexProvider } from "dialexjs/preact";
import { render } from "preact";

import { App } from "./app";
import { dialex } from "./dialex.generated";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);
```

## Wörterbücher verwenden

`useDictionary(name)` gibt das Wörterbuch des aktuellen Locale zurück, und `useT(...names)` gibt eine Funktion `t("dictionary.key", values?)` zurück:

```tsx
import { useDictionary, useT } from "dialexjs/preact";
import { useState } from "preact/hooks";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

Die Werte werden anhand der ICU-Nachricht typgeprüft, daher muss `count` oben eine Zahl sein.

## Das Locale wechseln

`useDialex()` gibt das aktive `locale` und `setLocale` zurück. Der Provider merkt sich die Auswahl im Cookie `locale` und hält `<html lang>` synchron:

```tsx
import { useDialex } from "dialexjs/preact";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale} onChange={(event) => setLocale(event.currentTarget.value)}>
      {locales.map((code) => (
        <option value={code}>{code.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

## Server-Rendering

Mit `preact-render-to-string` oder einem Framework wie Fresh übergibst du das vom Server ermittelte Locale als `initialLocale`, damit das Markup und das erste Client-Rendering übereinstimmen. Mit [`dialexjs/web`](./web.md) ermittelst du es aus der Anfrage:

```tsx
import { DialexProvider } from "dialexjs/preact";
import { createDialexHandler } from "dialexjs/web";
import { renderToString } from "preact-render-to-string";

import { App } from "./app";
import { dialex } from "./dialex.generated";

const resolveDialex = createDialexHandler({ ...dialex });

export async function render(request: Request) {
  const { locale } = await resolveDialex(request);
  return renderToString(
    <DialexProvider {...dialex} initialLocale={locale}>
      <App />
    </DialexProvider>,
  );
}
```

## API

| Export                         | Beschreibung                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<DialexProvider {...dialex}>` | Stellt dem Baum Locale und Wörterbücher bereit. Props: die generierten `dictionaries`, `config`, `loaders` sowie `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` oder `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Gibt `{ locale, setLocale, store }` zurück. Wirft außerhalb eines `DialexProvider` einen Fehler                                                                                                                                                  |
| `useDictionary(name)`          | Das Wörterbuch für das aktuelle Locale, entlang der Fallback-Kette. Die Komponente wird bei Locale-Wechsel und beim Laden eines Lazy-Wörterbuchs neu gerendert                                                                                   |
| `useT(...names)`               | Eine Funktion `t("dictionary.key", values?)`, die an das aktuelle Locale gebunden ist. Nenne die Wörterbücher, um sie mit Lazy Loading zu laden                                                                                                  |
| `useDialexConfig()`            | Die generierte `config` (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                            |

## Lazy Loading

Mit `lazy: true` oder `"locale"` in `dialex.config.ts` gibt `useDictionary` ein leeres Objekt zurück, bis das Wörterbuch geladen ist, und die Komponente wird neu gerendert, sobald es eintrifft. Lade mit `preloadDictionaries` vor, was die nächste Ansicht braucht:

```ts
import { preloadDictionaries } from "dialexjs/preact";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Bewährte Vorgehensweisen

- Rendere `DialexProvider` einmal an der Wurzel. Jede Komponente darunter teilt dasselbe Locale und dieselben geladenen Wörterbücher.
- Übergib `initialLocale`, wenn du auf dem Server renderst. Ohne es rendert der Server das Standard-Locale, und das gemerkte wird nach dem Mounten angewendet.
- Rufe Hooks auf oberster Ebene der Komponente auf, wie bei jedem Preact-Hook.
- Verwende `useT("home")` für Text mit Zahlen oder Auswahl und lies einfache Strings aus `useDictionary("home")`.

## Fehlerbehebung

- **`useDialex must be used within a DialexProvider`**: Die Komponente wird außerhalb des Providers gerendert. Umschließe die Wurzel mit `<DialexProvider {...dialex}>`.
- **Der Text zeigt beim Laden kurz die Standardsprache**: Das gemerkte Locale wird nach dem Mounten angewendet. Ermittle es auf dem Server und übergib es als `initialLocale`.
- **Schlüssel werden nicht automatisch vervollständigt**: Führe `dx generate` aus und binde `dialex-env.d.ts` in deine `tsconfig` ein. Die CLI fügt die Deklarationen von `dialexjs/preact` hinzu, wenn `preact` in `package.json` steht.
