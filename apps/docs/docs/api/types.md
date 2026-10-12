# Types

The types of `dialexjs`, and what the two generated files contain. Everything on this page is a type unless it says otherwise; import it with `import type { Locales } from "dialexjs"`.

## The generated files

`dialex generate` writes two files next to each other (see [`dialex generate`](../cli/generate.md)).

**`dialex.generated.ts`** exports:

| Export          | Description                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | The array of dictionary definitions. Also the default export                                                    |
| `dictionaryMap` | `{ [name]: dictionary }`, for direct lookup                                                                     |
| `config`        | The client-safe settings: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`                      |
| `locales`       | The configured locales as a readonly tuple, handy for a language switcher                                       |
| `Locale`        | `(typeof locales)[number]`: the union of the configured locales                                                 |
| `dialex`        | `{ dictionaries, config }`, or with lazy loading `{ config, loaders }`. Spread it into a provider or an adapter |

**`dialex-env.d.ts`** augments `Register`, `DictionaryRegistry` and `MessageArguments` of `dialexjs` and of each framework entry point you use. It is the reason `getDictionary("home")` and `t("home.title")` are typed. Include it in your `tsconfig.json`.

## Registries

These are empty interfaces that the generated declarations fill in.

| Interface            | Augmented with                                                                                     | Effect                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `Register`           | `locales: "en" \| "tr"`                                                                            | Narrows `Locales` to your configured locales            |
| `DictionaryRegistry` | One property per dictionary: its name and the content type                                         | Types dictionary names, `getDictionary` and `t()` paths |
| `MessageArguments`   | `{ "cart.items": { count: number } }`: the ICU arguments of each message, by `dictionary.key` path | `t("cart.items", { count })` is checked                 |

## Helper types

| Type                         | Definition                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Locales`                    | The union of your configured locales, or `string` before `dialex generate` has run                                     |
| `DictionaryKey`              | A dictionary name: the registered names (with autocomplete) or any `string` when none are registered                   |
| `ResolveDictionaryType<K>`   | The content type of the dictionary named `K`, or `any`                                                                 |
| `Dictionary<T>`              | `Record<Locales, T>`: one content object per locale                                                                    |
| `DictionaryDefinition<N, T>` | `{ name: N; dictionary: Record<string, T> }`: what `defineDictionary` returns                                          |
| `Translate`                  | The type of `t`: `<P extends TranslationPath>(path: P, ...args: TranslationArgs<P>) => TranslationResult<P>`           |
| `TranslationPath`            | Every `dictionary.key.path` of a registered dictionary, or `string`                                                    |
| `TranslationArgs<P>`         | A function leaf's own parameters, `[values: MessageArguments[P]]` for an ICU message, otherwise `[values?: IcuValues]` |
| `TranslationResult<P>`       | The string, or the return type of a function leaf                                                                      |
| `PathsOf<T>`                 | The dotted paths of every leaf of a dictionary content type `T`                                                        |

## Example

```ts
import type { Locales } from "dialexjs";

import { locales, type Locale } from "./dialex.generated";

// "en" | "tr" once `dialex generate` has run
const current: Locales = "tr";

// the same union, from the generated file
const options: readonly Locale[] = locales;
```

Related types are on the pages of the functions that use them: [`DialexConfig`](./core.md#dialexconfig), [`DialexSource`](./core.md#generated-file-types), [`PluralForms`](./formatting.md#types) and [`IcuValues`](./icu.md#types-and-errors).
