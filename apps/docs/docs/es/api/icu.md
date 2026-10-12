# Mensajes ICU

El analizador y formateador de ICU MessageFormat. `dialexjs` reexporta `formatMessage`, `parseMessage`, las clases de error y los tipos de nodo y valor; `dialexjs/icu` exporta además los ayudantes de introspección y no carga el resto del runtime. La sintaxis de los mensajes está en [Mensajes ICU](../guide/icu.md).

```ts
import { formatMessage } from "dialexjs/icu";
```

## `formatMessage(locale, message, values?)`

```ts
function formatMessage(locale: string, message: string | IcuNode[], values?: IcuValues): string;
```

| Parámetro | Descripción                                                      |
| --------- | ---------------------------------------------------------------- |
| `locale`  | La etiqueta BCP 47 usada para reglas de plural, números y fechas |
| `message` | El texto del mensaje, o los nodos que devuelve `parseMessage`    |
| `values`  | Los argumentos por nombre. Por defecto `{}`                      |

```ts
formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
// "3 items"
```

Un mensaje de texto se compila una vez y se guarda en caché (hasta 500 mensajes distintos), así que formatear de nuevo el mismo mensaje no vuelve a analizarlo.

| Lanza            | Cuándo                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `IcuSyntaxError` | El mensaje no es ICU válido                                                                    |
| `IcuFormatError` | Falta un valor, un argumento `plural`/`number` no es un número finito o una fecha no es válida |

## `parseMessage(message)`

```ts
function parseMessage(message: string): IcuNode[];
```

Analiza un mensaje en nodos y lanza `IcuSyntaxError` con la posición del problema. Úsalo para validar un mensaje o inspeccionar sus argumentos.

## `getArguments(nodes)`

```ts
function getArguments(nodes: IcuNode[]): IcuArgument[];
```

Lista los argumentos distintos de un mensaje analizado, incluidos los de ramas anidadas, en orden de primera aparición.

```ts
getArguments(parseMessage("{n, plural, one {# file} other {# files}} for {name}"));
// [{ name: "n", type: "plural", selectors: ["one", "other"] }, { name: "name", type: "argument" }]
```

## `argumentSignature(nodes)`

```ts
function argumentSignature(nodes: IcuNode[]): string;
```

Una descripción comparable de los argumentos de un mensaje que ignora el texto de las ramas de plural y select. Dos traducciones de una clave tienen la misma firma cuando usan los mismos argumentos; `dialex check` la usa para informar de `icu-args-mismatch`.

## `isIcuStructured(message)`

```ts
function isIcuStructured(message: string): boolean;
```

Si un mensaje usa `plural`, `selectordinal`, `select`, `number`, `date` o `time`, frente a simples marcadores `{name}`. Decide con qué rigor se trata un error de análisis.

## `findPlurals(nodes)`

```ts
function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[];
```

Cada nodo `plural` y `selectordinal` de un mensaje analizado, incluidos los anidados. `dialex check` lo usa para encontrar categorías de plural que un idioma necesita y el mensaje no tiene.

<a id="types-and-errors"></a>

## Tipos y errores

| Nombre            | Descripción                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `IcuNode`         | Un nodo de un mensaje analizado: `literal`, `argument`, `number`, `date`, `time`, `plural`, `select` o `pound` (`#`) |
| `IcuValue`        | `string \| number \| boolean \| Date \| null \| undefined`                                                           |
| `IcuValues`       | `Record<string, IcuValue>`                                                                                           |
| `IcuArgument`     | `{ name, type, selectors? }`: un argumento de un mensaje                                                             |
| `IcuArgumentType` | `"argument" \| "number" \| "date" \| "time" \| "plural" \| "selectordinal" \| "select"`                              |
| `IcuSyntaxError`  | Extiende `Error`. `position` es el desplazamiento, base cero, del problema en el mensaje                             |
| `IcuFormatError`  | Extiende `Error`. Se lanza por valores ausentes o no válidos                                                         |
