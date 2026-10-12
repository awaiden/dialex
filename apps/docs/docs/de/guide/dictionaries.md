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

Jedes Wörterbuch sollte für jedes Locale dieselben Schlüssel definieren. Führe [`dialex check`](../cli/check.md) in der CI aus, um das durchzusetzen; es meldet auch ein konfiguriertes Locale, das einem Wörterbuch fehlt.

## Regeln

- **Der Name ist ein Literal und eindeutig.** `defineDictionary("home", ...)`: ein String-Literal, keine Variable und kein Ausdruck. Er ist das erste Segment jedes [Schlüsselpfads](./key-paths.md) und das Argument von `getDictionary`. Zwei Wörterbücher mit demselben Namen kollidieren: Nur eines ist erreichbar.
- **Ein Default-Export je Datei.** `dialex generate` findet Wörterbücher über den Glob `include` und liest den Default-Export jeder Datei.
- **Jede Locale hat dieselben Schlüssel.** [`dialex check`](../cli/check.md) meldet die, bei denen das nicht so ist.
- **Schlüssel dürfen keine Punkte enthalten.** Ein Punkt ist das Trennzeichen eines Schlüsselpfads, daher ist `"nav.about"` ein verschachteltes Objekt `nav` mit dem Schlüssel `about`, nicht ein Schlüssel.

<a id="what-the-tools-can-read"></a>

## Was die Werkzeuge lesen können

`dialex generate`, `dialex check`, die Editor-Erweiterung und der Language Server lesen deine Wörterbücher aus ihrem **Syntaxbaum**, ohne sie auszuführen. Das macht sie schnell und sicher im Editor. Es bedeutet auch, dass sie nur verstehen, was als einfache Werte geschrieben ist:

| In der Wörterbuchdatei                                                       | Statisch lesbar? |
| ---------------------------------------------------------------------------- | ---------------- |
| `defineDictionary("home", { en: { ... }, tr: { ... } })`                     | Ja               |
| `defineDictionary({ name: "home", dictionary: { ... } })`                    | Ja               |
| Verschachtelte Objekte, String-Literale, Funktionen und Methoden             | Ja               |
| `...shared` (ein Spread) irgendwo in den Locales oder ihrem Inhalt           | Nein             |
| Berechnete Schlüssel: `[key]: "..."`                                         | Nein             |
| Eine Locale, deren Inhalt eine Variable oder ein Import ist: `en: enStrings` | Nein             |
| Ein Name, der kein String-Literal ist                                        | Nein             |

Ein Wörterbuch, das sich nicht statisch lesen lässt, ist nicht falsch; die Werkzeuge müssen es nur ausführen. `dialex check` tut das (es importiert die Datei), die native Binärdatei übergibt den Befehl an die Node-CLI, und der Editor meldet die Datei als „nicht analysierbar“ und überspringt sie, sodass es für ihre Schlüssel keine Diagnosen, kein Hover und keine Vervollständigung gibt. Willst du überall Editor-Unterstützung, halte Wörterbücher als Objektliterale und teile Text mit einer Funktion oder einem Helfer, der innerhalb eines Blatts aufgerufen wird, statt Objekte zu spreaden.
