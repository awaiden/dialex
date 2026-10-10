# Solid

`dialexjs/solid` bietet einen Kontext-Provider und feingranulare Accessors für SolidJS. Ein Wörterbuch ist ein Accessor, daher liest JSX `home().title`, und bei einem Locale-Wechsel werden nur die Textknoten aktualisiert, die es verwenden.

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
import { DialexProvider } from "dialexjs/solid";
import { render } from "solid-js/web";

import App from "./App";
import { dialex } from "./dialex.generated";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);
```

## Wörterbücher verwenden

`useDictionary(name)` gibt einen Accessor zurück. Rufe ihn in JSX oder in einem Effekt auf, damit das Lesen verfolgt wird:

```tsx
import { useDictionary, useT } from "dialexjs/solid";
import { createSignal } from "solid-js";

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = createSignal(2);

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: count() })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

`useT(...names)` gibt eine Funktion `t("dictionary.key", values?)` zurück. Werte werden anhand der ICU-Nachricht typgeprüft, daher muss `count` oben eine Zahl sein.

## Das Locale wechseln

`useDialex()` gibt den Accessor `locale` und `setLocale` zurück. Der Provider merkt sich die Wahl im Cookie `locale` und hält `<html lang>` synchron:

```tsx
import { useDialex } from "dialexjs/solid";
import { For } from "solid-js";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale()} onChange={(event) => setLocale(event.currentTarget.value)}>
      <For each={locales}>{(code) => <option value={code}>{code.toUpperCase()}</option>}</For>
    </select>
  );
}
```

## API

| Export                         | Beschreibung                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<DialexProvider {...dialex}>` | Stellt dem Baum Locale und Wörterbücher bereit. Props: die generierten `dictionaries`, `config`, `loaders` sowie `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` oder `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Gibt `{ locale, setLocale, store }` zurück. `locale` ist ein Accessor. Wirft außerhalb eines `DialexProvider`                                                                                                                                    |
| `useDictionary(name)`          | Ein Accessor des Wörterbuchs für das aktuelle Locale, entlang der Fallback-Kette. Aktualisiert sich bei Locale-Wechsel und wenn ein Lazy-Wörterbuch lädt                                                                                         |
| `useT(...names)`               | Eine Funktion `t("dictionary.key", values?)`, die dem aktuellen Locale folgt. Nenne die Wörterbücher, um sie bei Lazy Loading zu laden                                                                                                           |

## Lazy Loading

Mit `lazy: true` oder `"locale"` in `dialex.config.ts` ist `useDictionary` leer, bis das Wörterbuch geladen ist, und aktualisiert dann den Accessor. Lade mit `preloadDictionaries` vor, was die nächste Ansicht braucht:

```ts
import { preloadDictionaries } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Bewährte Vorgehensweisen

- Lies den Accessor dort, wo du ihn nutzt (`{home().title}`), nicht einmal oben in der Komponente in eine einfache Variable. Ein aus dem Accessor kopierter Wert aktualisiert sich bei einem Locale-Wechsel nicht.
- Rufe `useDictionary` und `useT` beim Erzeugen der Komponente auf (auf oberster Ebene), weil sie den Kontext von Solid lesen. Rufe sie nicht in Event-Handlern auf.
- Verwende `<For>` und `<Show>` für Listen und Bedingungen, mit Text aus dem Wörterbuch darin; Dialex-Zeichenketten sind einfache Werte und funktionieren mit jeder Kontrollfluss-Komponente von Solid.
- Verwende ICU-Nachrichten für Text mit Zahlen oder Auswahl und übergib reaktive Werte (`count()`), damit die Nachricht neu gerendert wird, wenn sie sich ändern.

## Fehlerbehebung

- **`useDialex must be used within a DialexProvider`**: Die Komponente wird außerhalb des Providers gerendert. Umschließe die Wurzel mit `<DialexProvider {...dialex}>`.
- **Der Text ändert sich beim Locale-Wechsel nicht**: Der Accessor wurde einmal außerhalb von JSX oder eines Effekts gelesen. Rufe `home()` dort auf, wo der Text gerendert wird.
- **Schlüssel werden nicht vervollständigt**: Führe `dx generate` aus und nimm `dialex-env.d.ts` in deine `tsconfig` auf. Das CLI fügt die Deklarationen für `dialexjs/solid` hinzu, wenn `solid-js` in der `package.json` steht.
