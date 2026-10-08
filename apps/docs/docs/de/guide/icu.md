# ICU-Nachrichten

Strings in einem Wörterbuch können [ICU-MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/)-Nachrichten sein. Übergib `t` ein Werte-Objekt, und Dialex formatiert die Nachricht für das aktive Locale.

```ts
import { defineDictionary } from "dialex";

export default defineDictionary("cart", {
  en: {
    items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    owner: "Hello, {name}!",
  },
  ru: {
    items: "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}",
    owner: "Здравствуйте, {name}!",
  },
});
```

```ts
t("cart.items", { count: 5 }); // en: "5 items"   ru: "5 товаров"
t("cart.owner", { name: "Ada" }); // "Hello, Ada!"
t("cart.owner"); // no values: the string is returned unchanged
```

ICU-Nachrichten funktionieren neben einfachen Strings und [Funktionswerten](./dictionaries.md#values); für bestehende Wörterbücher ändert sich nichts. Nachrichten werden einmal geparst und zwischengespeichert.

## Syntax

| Syntax         | Beispiel                                                                                     | Hinweise                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Argument       | `{name}`                                                                                     | Beliebiger Wert; wird mit `String()` umgewandelt                                                                                         |
| Zahl           | `{n, number}`, `{n, number, integer}`, `{n, number, percent}`, `{n, number, ::currency/USD}` | `Intl.NumberFormat`                                                                                                                      |
| Datum, Uhrzeit | `{d, date, long}`, `{d, time, short}`                                                        | Stile `short`, `medium` (Standard), `long`, `full`; der Wert ist ein `Date`, ein Zeitstempel oder ein Datums-String                      |
| Plural         | `{n, plural, =0 {none} one {# item} other {# items}}`                                        | Exakte Treffer mit `=N`, danach die CLDR-Kategorien des Locales (`zero`, `one`, `two`, `few`, `many`, `other`). `other` ist erforderlich |
| Plural-Offset  | `{n, plural, offset:1 =0 {nobody} one {you and # other} other {you and # others}}`           | `#` und die Kategorien verwenden `n - offset`; `=N` passt auf das ursprüngliche `n`                                                      |
| Ordinal        | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`                              | Ordinale Pluralregeln                                                                                                                    |
| Select         | `{gender, select, female {She} male {He} other {They}}`                                      | Vergleicht den Wert als String. `other` ist erforderlich                                                                                 |
| `#`            | innerhalb eines Plural-Zweigs                                                                | Die formatierte Zahl. Ein in einem Plural verschachteltes `select` bezieht sich weiterhin auf den umgebenden Plural                      |
| Quoting        | `'{'`, `'}'`, `''`                                                                           | `''` ist ein Apostroph. Ein einzelnes `'`, dem keine Klammer folgt, ist literaler Text                                                   |

Zweige können alles Obige enthalten, daher lassen sich Plurale und Selects verschachteln.

### Nicht unterstützt

- Rich-Text-Tags wie `<b>…</b>` werden nicht interpretiert; sie sind einfacher Text.
- Zahlen-Skeletons außer `::percent` und `::currency/XXX` sowie Datums-Skeletons werden nicht unterstützt. Unbekannte Zahlen- oder Datumsstile fallen auf den Standardstil zurück.

## Fehler

Lässt sich eine Nachricht nicht formatieren, zum Beispiel weil ein Wert fehlt, protokolliert `t` eine Warnung und gibt die Nachricht unverändert zurück, sodass ein fehlerhafter String nie eine Seite zum Absturz bringt. `formatMessage` selbst wirft `IcuFormatError` (fehlende oder ungültige Werte) oder `IcuSyntaxError` (mit Position).

```ts
import { formatMessage } from "dialex";

formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: 3 });
```

## Typen

Argumentnamen werden **nicht** typgeprüft: Wörterbuch-Strings haben den Typ `string`, daher kann TypeScript die Argumente darin nicht sehen. Abweichungen zwischen Locales findet stattdessen [`dialex check`](../cli/check.md). `t` prüft nur, dass ein String-Schlüssel ein Werte-Objekt (oder nichts) erhält; Funktionsschlüssel behalten ihre eigenen Parametertypen.

## Werkzeuge

- [`dialex check`](../cli/check.md) meldet ungültiges ICU, Locales, die andere Argumente verwenden als das Standard-Locale, und für eine Sprache fehlende Plural-Optionen (Russisch braucht zum Beispiel `few` und `many`).
- [`dialex translate`](../cli/translate.md) lässt die Struktur intakt: Argumente, Typen, `select`-Schlüssel und exakte `=N`-Treffer müssen erhalten bleiben, Plural-Kategorien dürfen sich ändern. Provider, die das nicht können (DeepL), erhalten ICU-Nachrichten gar nicht erst.
- [`dialex import`](../cli/import.md) lehnt Werte ab, die ungültiges ICU sind oder die Argumente desselben Schlüssels in einem anderen Locale ändern.
- [`dialex export`](../cli/export.md) schreibt ICU-Nachrichten als einfache Strings. Bitte Übersetzer, die gesamte Struktur innerhalb von `{ }` beizubehalten und nur den Text in den Zweigen zu übersetzen.
