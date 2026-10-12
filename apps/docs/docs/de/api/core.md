# Core

Der Einstiegspunkt `dialexjs`: Konfiguration, Wörterbücher und die Funktion `t`. Die Formatierungshelfer stehen unter [Formatierung](./formatting.md), die Typen unter [Typen](./types.md).

## `defineConfig(config)`

```ts
function defineConfig(config: DialexConfig): DialexConfig;
```

Gibt `dialex.config.ts` seine Typen und liefert das Objekt unverändert zurück.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
```

Alle Optionen stehen unter [Konfiguration](../guide/configuration.md).

## `defineDictionary(name, dictionary)`

```ts
function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;

function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
```

| Parameter    | Beschreibung                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`       | Der Wörterbuchname: das erste Segment jedes `t()`-Pfads und das Argument von `getDictionary`. Er muss eindeutig und ein Literal sein |
| `dictionary` | Ein Objekt, das jede Locale auf ihren Inhalt abbildet: Strings, verschachtelte Objekte oder Funktionen                               |

Die Funktion registriert das Wörterbuch in [`globalDictionaries`](#globaldictionaries) und gibt `{ name, dictionary }` zurück. Lege jedes Wörterbuch als Default-Export in eine eigene `*.content.ts`-Datei, damit `dialex generate` es findet. Siehe [Wörterbücher](../guide/dictionaries.md).

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Welcome", greeting: (name: string) => `Hello, ${name}!` },
  tr: { title: "Hoş geldiniz", greeting: (name: string) => `Merhaba, ${name}!` },
});
```

<a id="createt"></a>

## `createT(getDictionary, locale?)`

```ts
function createT(getDictionary: (name: any) => any, locale?: string): Translate;
```

Baut eine Funktion `t("dictionary.key.path", ...args)` auf einem `getDictionary(name)`-Zugriff auf. Die Framework-Adapter erledigen das für dich; rufe sie selbst in einem Skript oder Test auf.

| Parameter       | Beschreibung                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `getDictionary` | Liefert den Inhalt des Wörterbuchs namens `name` für die Locale        |
| `locale`        | Die Locale, mit der ICU-Nachrichten formatiert werden. Standard `"en"` |

Was `t(path, ...args)` zurückgibt:

| Der Pfad führt zu                               | Ergebnis                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Einer Funktion                                  | `fn(...args)`: Die zusätzlichen Argumente gehen an die Funktion                |
| Einem String und keinem Werteobjekt             | Der String, wie er ist. Es wird nichts geparst                                 |
| Einem String und einem Werteobjekt (`{ n: 3 }`) | Der String, als [ICU-Nachricht](../guide/icu.md) für `locale` formatiert       |
| Nichts                                          | `console.warn("[dialex] Translation path ... not found.")` und der Pfad selbst |

Ein String, der sich nicht formatieren lässt (ungültiges ICU oder ein fehlender Wert), wird mit `console.warn` gemeldet und unverändert zurückgegeben, sodass ein fehlerhafter String nie eine Seite zum Absturz bringt. Siehe [Schlüsselpfade](../guide/key-paths.md).

## `globalDictionaries`

```ts
const globalDictionaries: Record<string, Record<string, any>>;
```

Die prozessinterne Registry, die `defineDictionary` füllt. Adapter lesen sie, wenn du ihnen keine `dictionaries` übergibst. Sie ist leer, bis die Wörterbuchdateien importiert wurden; deshalb ist das generierte `dialex`-Objekt der verlässliche Weg, Wörterbücher zu übergeben.

## `DEFAULT_CONFIG`

```ts
const DEFAULT_CONFIG: {
  defaultLocale: string; // "en"
  locales: string[]; // []
  include: string | string[]; // "**/*.content.ts"
  fallbacks: Record<string, string[]>; // {}
  prefixDefault: boolean; // true
  lazy: boolean | "locale"; // false
};
```

Was jedes Werkzeug für eine fehlende Einstellung oder die ganze fehlende Konfigurationsdatei verwendet. `locales` ist leer: `dialex generate` nimmt dann die Locales, die deine Wörterbücher definieren.

## Konfigurationstypen

### `DialexConfig`

Die Form von `dialex.config.ts`. Jedes Feld ist optional.

| Feld            | Typ                        | Standard            | Beschreibung                                                                                   |
| --------------- | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                   | `"en"`              | Locale, wenn keine bestimmt werden kann                                                        |
| `locales`       | `string[]`                 | —                   | Unterstützte Locales                                                                           |
| `include`       | `string \| string[]`       | `"**/*.content.ts"` | Glob(s) der Wörterbuchdateien                                                                  |
| `exclude`       | `string[]`                 | —                   | Globs, die nie durchsucht werden, zusätzlich zu `node_modules`, Build-Ausgabe und `.gitignore` |
| `output`        | `string`                   | `src/` oder Wurzel  | Wohin `dialex.generated.ts` geschrieben wird                                                   |
| `configFile`    | `string`                   | —                   | Eigener Pfad der Konfigurationsdatei                                                           |
| `fallbacks`     | `Record<string, string[]>` | —                   | Explizite [Fallback-Ketten](../guide/fallbacks.md)                                             |
| `prefixDefault` | `boolean`                  | `true`              | Ob auch die Standard-Locale ein URL-Präfix bekommt                                             |
| `lazy`          | `boolean \| "locale"`      | `false`             | Wörterbücher bei Bedarf laden. Siehe [Lazy Loading](../guide/lazy-loading.md)                  |
| `translate`     | `TranslateConfig`          | —                   | Einstellungen von [`dialex translate`](../cli/translate.md)                                    |

### `TranslateConfig`

| Feld           | Typ                 | Beschreibung                                      |
| -------------- | ------------------- | ------------------------------------------------- |
| `provider`     | `TranslateProvider` | Das Backend, das Strings übersetzt. Erforderlich  |
| `sourceLocale` | `string`            | Die Ausgangs-Locale. Standard ist `defaultLocale` |

### `TranslateProvider`

```ts
interface TranslateProvider {
  name?: string;
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}
```

`translate` erhält einfache Strings und muss pro Eingabe genau eine Übersetzung in derselben Reihenfolge zurückgeben. Setze `supportsIcu` nur, wenn der Provider die Struktur von `plural`- und `select`-Nachrichten erhält; Nachrichten mit dieser Syntax werden nicht an Provider gesendet, die das nicht tun. Siehe [`dialex translate`](../cli/translate.md).

<a id="generated-file-types"></a>

## Typen der generierten Datei

| Typ                  | Beschreibung                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexSource`       | Was der generierte Export `dialex` enthält und Provider akzeptieren: `dictionaries`, `config` und im Lazy-Modus `loaders`                                                  |
| `DialexClientConfig` | Die Einstellungen, die `dialex generate` in `dialex.generated.ts` kopiert: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`. `translate` ist nie enthalten |
| `DictionaryLoader`   | `() => Promise<any>`: lädt ein Wörterbuch oder eine seiner Locales                                                                                                         |
| `DictionaryLoaders`  | Loader nach Wörterbuchname. Mit `lazy: "locale"` bildet ein Wörterbuch jede Locale auf einen eigenen Loader ab                                                             |
