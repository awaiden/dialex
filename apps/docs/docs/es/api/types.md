# Tipos

Los tipos de `dialexjs` y lo que contienen los dos archivos generados. Todo lo de esta página es un tipo salvo que se indique otra cosa; impórtalo con `import type { Locales } from "dialexjs"`.

## Los archivos generados

`dialex generate` escribe dos archivos uno junto al otro (consulta [`dialex generate`](../cli/generate.md)).

**`dialex.generated.ts`** exporta:

| Export          | Descripción                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | El array de definiciones de diccionario. También es el export por defecto                                        |
| `dictionaryMap` | `{ [name]: dictionary }`, para acceso directo                                                                    |
| `config`        | Los ajustes seguros para el cliente: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`            |
| `locales`       | Los locales configurados como tupla de solo lectura, útil para un selector de idioma                             |
| `Locale`        | `(typeof locales)[number]`: la unión de los locales configurados                                                 |
| `dialex`        | `{ dictionaries, config }`, o con carga diferida `{ config, loaders }`. Propágalo en un proveedor o un adaptador |

**`dialex-env.d.ts`** amplía `Register`, `DictionaryRegistry` y `MessageArguments` de `dialexjs` y de cada punto de entrada de framework que uses. Es la razón por la que `getDictionary("home")` y `t("home.title")` están tipados. Inclúyelo en tu `tsconfig.json`.

## Registros

Son interfaces vacías que las declaraciones generadas rellenan.

| Interfaz             | Ampliada con                                                                                         | Efecto                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Register`           | `locales: "en" \| "tr"`                                                                              | Reduce `Locales` a tus locales configurados                       |
| `DictionaryRegistry` | Una propiedad por diccionario: su nombre y el tipo de contenido                                      | Tipa los nombres de diccionario, `getDictionary` y rutas de `t()` |
| `MessageArguments`   | `{ "cart.items": { count: number } }`: los argumentos ICU de cada mensaje, por ruta `dictionary.key` | Se comprueba `t("cart.items", { count })`                         |

## Tipos auxiliares

| Tipo                         | Definición                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Locales`                    | La unión de tus locales configurados, o `string` antes de ejecutar `dialex generate`                                             |
| `DictionaryKey`              | Un nombre de diccionario: los nombres registrados (con autocompletado) o cualquier `string` cuando no hay ninguno                |
| `ResolveDictionaryType<K>`   | El tipo de contenido del diccionario llamado `K`, o `any`                                                                        |
| `Dictionary<T>`              | `Record<Locales, T>`: un objeto de contenido por locale                                                                          |
| `DictionaryDefinition<N, T>` | `{ name: N; dictionary: Record<string, T> }`: lo que devuelve `defineDictionary`                                                 |
| `Translate`                  | El tipo de `t`: `<P extends TranslationPath>(path: P, ...args: TranslationArgs<P>) => TranslationResult<P>`                      |
| `TranslationPath`            | Cada `dictionary.key.path` de un diccionario registrado, o `string`                                                              |
| `TranslationArgs<P>`         | Los parámetros propios de una hoja de función, `[values: MessageArguments[P]]` para un mensaje ICU, si no `[values?: IcuValues]` |
| `TranslationResult<P>`       | La cadena, o el tipo de retorno de una hoja de función                                                                           |
| `PathsOf<T>`                 | Las rutas con puntos de cada hoja de un tipo de contenido de diccionario `T`                                                     |

## Ejemplo

```ts
import type { Locales } from "dialexjs";

import { locales, type Locale } from "./dialex.generated";

// "en" | "tr" once `dialex generate` has run
const current: Locales = "tr";

// the same union, from the generated file
const options: readonly Locale[] = locales;
```

Los tipos relacionados están en las páginas de las funciones que los usan: [`DialexConfig`](./core.md#dialexconfig), [`DialexSource`](./core.md#generated-file-types), [`PluralForms`](./formatting.md#types) y [`IcuValues`](./icu.md#types-and-errors).
