# Typen

Die Typen von `dialexjs` und was die beiden generierten Dateien enthalten. Alles auf dieser Seite ist ein Typ, sofern nicht anders angegeben; importiere es mit `import type { Locales } from "dialexjs"`.

## Die generierten Dateien

`dialex generate` schreibt zwei Dateien nebeneinander (siehe [`dialex generate`](../cli/generate.md)).

**`dialex.generated.ts`** exportiert:

| Export          | Beschreibung                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `dictionaries`  | Das Array der Wörterbuchdefinitionen. Auch der Default-Export                                                |
| `dictionaryMap` | `{ [name]: dictionary }` für den direkten Zugriff                                                            |
| `config`        | Die clientsicheren Einstellungen: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`           |
| `locales`       | Die konfigurierten Locales als readonly-Tupel, praktisch für einen Sprachumschalter                          |
| `Locale`        | `(typeof locales)[number]`: die Union der konfigurierten Locales                                             |
| `dialex`        | `{ dictionaries, config }`, mit Lazy Loading `{ config, loaders }`. Spread es in einen Provider oder Adapter |

**`dialex-env.d.ts`** ergänzt `Register`, `DictionaryRegistry` und `MessageArguments` von `dialexjs` und jedes verwendeten Framework-Einstiegspunkts. Dadurch sind `getDictionary("home")` und `t("home.title")` typisiert. Nimm sie in deine `tsconfig.json` auf.

## Registries

Das sind leere Interfaces, die die generierten Deklarationen füllen.

| Interface            | Ergänzt um                                                                                           | Wirkung                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Register`           | `locales: "en" \| "tr"`                                                                              | Verengt `Locales` auf deine konfigurierten Locales         |
| `DictionaryRegistry` | Eine Eigenschaft je Wörterbuch: sein Name und der Inhaltstyp                                         | Typisiert Wörterbuchnamen, `getDictionary` und `t()`-Pfade |
| `MessageArguments`   | `{ "cart.items": { count: number } }`: die ICU-Argumente jeder Nachricht, nach Pfad `dictionary.key` | `t("cart.items", { count })` wird geprüft                  |

## Hilfstypen

| Typ                          | Definition                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Locales`                    | Die Union deiner konfigurierten Locales oder `string`, bevor `dialex generate` gelaufen ist                                       |
| `DictionaryKey`              | Ein Wörterbuchname: die registrierten Namen (mit Autovervollständigung) oder ein beliebiger `string`, wenn keine registriert sind |
| `ResolveDictionaryType<K>`   | Der Inhaltstyp des Wörterbuchs namens `K` oder `any`                                                                              |
| `Dictionary<T>`              | `Record<Locales, T>`: ein Inhaltsobjekt je Locale                                                                                 |
| `DictionaryDefinition<N, T>` | `{ name: N; dictionary: Record<string, T> }`: was `defineDictionary` zurückgibt                                                   |
| `Translate`                  | Der Typ von `t`: `<P extends TranslationPath>(path: P, ...args: TranslationArgs<P>) => TranslationResult<P>`                      |
| `TranslationPath`            | Jeder `dictionary.key.path` eines registrierten Wörterbuchs oder `string`                                                         |
| `TranslationArgs<P>`         | Die eigenen Parameter eines Funktionsblatts, `[values: MessageArguments[P]]` für eine ICU-Nachricht, sonst `[values?: IcuValues]` |
| `TranslationResult<P>`       | Der String oder der Rückgabetyp eines Funktionsblatts                                                                             |
| `PathsOf<T>`                 | Die Punktpfade jedes Blatts eines Wörterbuch-Inhaltstyps `T`                                                                      |

## Beispiel

```ts
import type { Locales } from "dialexjs";

import { locales, type Locale } from "./dialex.generated";

// "en" | "tr" once `dialex generate` has run
const current: Locales = "tr";

// the same union, from the generated file
const options: readonly Locale[] = locales;
```

Verwandte Typen stehen auf den Seiten der Funktionen, die sie verwenden: [`DialexConfig`](./core.md#dialexconfig), [`DialexSource`](./core.md#generated-file-types), [`PluralForms`](./formatting.md#types) und [`IcuValues`](./icu.md#types-and-errors).
