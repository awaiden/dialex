# ICU-Nachrichten

Der Parser und Formatter für ICU MessageFormat. `dialexjs` re-exportiert `formatMessage`, `parseMessage`, die Fehlerklassen sowie die Node- und Werttypen; `dialexjs/icu` exportiert zusätzlich die Introspektionshelfer und lädt den Rest der Laufzeit nicht. Die Nachrichtensyntax selbst steht unter [ICU-Nachrichten](../guide/icu.md).

```ts
import { formatMessage } from "dialexjs/icu";
```

## `formatMessage(locale, message, values?)`

```ts
function formatMessage(locale: string, message: string | IcuNode[], values?: IcuValues): string;
```

| Parameter | Beschreibung                                                      |
| --------- | ----------------------------------------------------------------- |
| `locale`  | Das BCP-47-Tag für Pluralregeln, Zahlen und Datumswerte           |
| `message` | Der Nachrichtentext oder die von `parseMessage` gelieferten Nodes |
| `values`  | Die Argumente nach Name. Standard `{}`                            |

```ts
formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
// "3 items"
```

Eine String-Nachricht wird einmal kompiliert und zwischengespeichert (bis zu 500 verschiedene Nachrichten), sodass dieselbe Nachricht beim erneuten Formatieren nicht erneut geparst wird.

| Wirft            | Wann                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `IcuSyntaxError` | Die Nachricht ist kein gültiges ICU                                                                 |
| `IcuFormatError` | Ein Wert fehlt, ein `plural`-/`number`-Argument ist keine endliche Zahl oder ein Datum ist ungültig |

## `parseMessage(message)`

```ts
function parseMessage(message: string): IcuNode[];
```

Parst eine Nachricht in Nodes und wirft `IcuSyntaxError` mit der Position des Problems. Nutze es, um eine Nachricht zu validieren oder ihre Argumente zu untersuchen.

## `getArguments(nodes)`

```ts
function getArguments(nodes: IcuNode[]): IcuArgument[];
```

Listet die verschiedenen Argumente einer geparsten Nachricht auf, auch die in verschachtelten Zweigen, in der Reihenfolge des ersten Auftretens.

```ts
getArguments(parseMessage("{n, plural, one {# file} other {# files}} for {name}"));
// [{ name: "n", type: "plural", selectors: ["one", "other"] }, { name: "name", type: "argument" }]
```

## `argumentSignature(nodes)`

```ts
function argumentSignature(nodes: IcuNode[]): string;
```

Eine vergleichbare Beschreibung der Argumente einer Nachricht, die den Text der Plural- und Select-Zweige ignoriert. Zwei Übersetzungen eines Schlüssels haben dieselbe Signatur, wenn sie dieselben Argumente verwenden; `dialex check` nutzt sie, um `icu-args-mismatch` zu melden.

## `isIcuStructured(message)`

```ts
function isIcuStructured(message: string): boolean;
```

Ob eine Nachricht `plural`, `selectordinal`, `select`, `number`, `date` oder `time` verwendet, im Gegensatz zu einfachen `{name}`-Platzhaltern. Davon hängt ab, wie streng ein Parse-Fehler behandelt wird.

## `findPlurals(nodes)`

```ts
function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[];
```

Jeder `plural`- und `selectordinal`-Node einer geparsten Nachricht, auch verschachtelte. `dialex check` nutzt ihn, um Pluralkategorien zu finden, die eine Sprache braucht, die Nachricht aber nicht hat.

<a id="types-and-errors"></a>

## Typen und Fehler

| Name              | Beschreibung                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `IcuNode`         | Ein Node einer geparsten Nachricht: `literal`, `argument`, `number`, `date`, `time`, `plural`, `select` oder `pound` (`#`) |
| `IcuValue`        | `string \| number \| boolean \| Date \| null \| undefined`                                                                 |
| `IcuValues`       | `Record<string, IcuValue>`                                                                                                 |
| `IcuArgument`     | `{ name, type, selectors? }`: ein Argument einer Nachricht                                                                 |
| `IcuArgumentType` | `"argument" \| "number" \| "date" \| "time" \| "plural" \| "selectordinal" \| "select"`                                    |
| `IcuSyntaxError`  | Erweitert `Error`. `position` ist der nullbasierte Offset des Problems in der Nachricht                                    |
| `IcuFormatError`  | Erweitert `Error`. Wird bei fehlenden oder ungültigen Werten geworfen                                                      |
