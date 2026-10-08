# Wörterbücher

Ein Wörterbuch ist ein benanntes Objekt, das jedem Locale seinen Inhalt zuordnet. Dateien werden über das Glob `include` gefunden (Standard: `**/*.content.ts`).

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Hello" },
  tr: { title: "Merhaba" },
});
```

`defineDictionary` kann auf zwei Arten aufgerufen werden:

```ts
defineDictionary("home", { en: {...}, tr: {...} });
defineDictionary({ name: "home", dictionary: { en: {...}, tr: {...} } });
```

Beide liefern `{ name, dictionary }` und registrieren das Wörterbuch in der prozessinternen Map `globalDictionaries`.

<a id="values"></a>

## Werte

Werte können Strings, verschachtelte Objekte oder Funktionen sein. Funktionen ermöglichen typisierte Interpolation:

```ts
en: {
  greeting: (name: string) => `Hello, ${name}!`,
  items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
}
```

## Locale-Parität

Jedes Wörterbuch sollte für jedes Locale dieselben Schlüssel definieren. Führe [`dialex check`](../cli/check.md) in der CI aus, um das durchzusetzen. Ist `locales` in der Konfiguration gesetzt, bricht auch das Vite-Plugin den Build ab, wenn einem Wörterbuch ein konfiguriertes Locale fehlt.
