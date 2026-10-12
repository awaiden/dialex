# Core

El punto de entrada `dialexjs`: configuración, diccionarios y la función `t`. Los ayudantes de formato están en [Formato](./formatting.md) y los tipos en [Tipos](./types.md).

## `defineConfig(config)`

```ts
function defineConfig(config: DialexConfig): DialexConfig;
```

Da sus tipos a `dialex.config.ts` y devuelve el objeto sin cambios.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
```

Consulta [Configuración](../guide/configuration.md) para ver cada opción.

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

| Parámetro    | Descripción                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | El nombre del diccionario: el primer segmento de cada ruta de `t()` y el argumento de `getDictionary`. Debe ser único y un literal |
| `dictionary` | Un objeto que asigna a cada locale su contenido: cadenas, objetos anidados o funciones                                             |

Registra el diccionario en [`globalDictionaries`](#globaldictionaries) y devuelve `{ name, dictionary }`. Pon cada diccionario como export por defecto de su propio archivo `*.content.ts`, para que `dialex generate` lo encuentre. Consulta [Diccionarios](../guide/dictionaries.md).

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

Construye una función `t("dictionary.key.path", ...args)` sobre un acceso `getDictionary(name)`. Los adaptadores de framework lo hacen por ti; llámalo tú mismo en un script o una prueba.

| Parámetro       | Descripción                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `getDictionary` | Devuelve el contenido del diccionario llamado `name` para el locale    |
| `locale`        | El locale con el que se formatean los mensajes ICU. Por defecto `"en"` |

Lo que devuelve `t(path, ...args)`:

| La ruta lleva a                                | Resultado                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Una función                                    | `fn(...args)`: los argumentos adicionales van a la función                  |
| Una cadena y ningún objeto de valores          | La cadena tal cual. No se analiza nada                                      |
| Una cadena y un objeto de valores (`{ n: 3 }`) | La cadena formateada como [mensaje ICU](../guide/icu.md) para `locale`      |
| Nada                                           | `console.warn("[dialex] Translation path ... not found.")` y la propia ruta |

Una cadena que no se puede formatear (ICU no válido o un valor ausente) se informa con `console.warn` y se devuelve sin cambios, de modo que una cadena defectuosa nunca rompe una página. Consulta [Rutas de claves](../guide/key-paths.md).

## `globalDictionaries`

```ts
const globalDictionaries: Record<string, Record<string, any>>;
```

El registro dentro del proceso que rellena `defineDictionary`. Los adaptadores lo leen cuando no les pasas `dictionaries`. Está vacío hasta que se han importado los archivos de diccionario, por eso el objeto `dialex` generado es la forma fiable de pasar diccionarios.

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

Lo que usan todas las herramientas para un ajuste que falta, o para todo el archivo de configuración ausente. `locales` está vacío: `dialex generate` usa entonces los locales que definen tus diccionarios.

## Tipos de configuración

### `DialexConfig`

La forma de `dialex.config.ts`. Todos los campos son opcionales.

| Campo           | Tipo                       | Por defecto         | Descripción                                                                               |
| --------------- | -------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                   | `"en"`              | Locale usado cuando no se puede resolver ninguno                                          |
| `locales`       | `string[]`                 | —                   | Locales admitidos                                                                         |
| `include`       | `string \| string[]`       | `"**/*.content.ts"` | Glob(s) de los archivos de diccionario                                                    |
| `exclude`       | `string[]`                 | —                   | Globs que nunca se analizan, además de `node_modules`, la salida de build y `.gitignore`  |
| `output`        | `string`                   | `src/` o la raíz    | Dónde se escribe `dialex.generated.ts`                                                    |
| `configFile`    | `string`                   | —                   | Ruta personalizada del archivo de configuración                                           |
| `fallbacks`     | `Record<string, string[]>` | —                   | [Cadenas de fallback](../guide/fallbacks.md) explícitas                                   |
| `prefixDefault` | `boolean`                  | `true`              | Si el locale por defecto también recibe prefijo de URL                                    |
| `lazy`          | `boolean \| "locale"`      | `false`             | Cargar los diccionarios bajo demanda. Consulta [Carga diferida](../guide/lazy-loading.md) |
| `lint`          | `LintConfig`               | —                   | Nivel y opciones de cada comprobación. Consulte [Linting](../guide/linting.md)            |
| `translate`     | `TranslateConfig`          | —                   | Ajustes de [`dialex translate`](../cli/translate.md)                                      |

### `LintConfig`

| Campo   | Tipo                              | Descripción                                                                      |
| ------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `rules` | `Record<string, LintRuleSetting>` | Nivel y opciones por código de diagnóstico, más `dynamic-key` y `literal-string` |

Un `LintRuleSetting` es un `LintSeverity` (`"off"`, `"warn"` o `"error"`), o `[LintSeverity, options]` para las comprobaciones que aceptan opciones. `dialex check`, los editores y [`@dialexjs/eslint-plugin`](../guide/linting.md) lo leen.

### `TranslateConfig`

| Campo          | Tipo                | Descripción                                                  |
| -------------- | ------------------- | ------------------------------------------------------------ |
| `provider`     | `TranslateProvider` | El backend que traduce las cadenas. Obligatorio              |
| `sourceLocale` | `string`            | El locale desde el que traducir. Por defecto `defaultLocale` |

### `TranslateProvider`

```ts
interface TranslateProvider {
  name?: string;
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}
```

`translate` recibe cadenas simples y debe devolver una traducción por entrada, en el mismo orden. Define `supportsIcu` solo cuando el proveedor conserva la estructura de los mensajes `plural` y `select`; los mensajes con esa sintaxis no se envían a proveedores que no lo hacen. Consulta [`dialex translate`](../cli/translate.md).

<a id="generated-file-types"></a>

## Tipos del archivo generado

| Tipo                 | Descripción                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexSource`       | Lo que contiene el export `dialex` generado y aceptan los proveedores: `dictionaries`, `config` y, en modo diferido, `loaders`                                   |
| `DialexClientConfig` | Los ajustes que `dialex generate` copia en `dialex.generated.ts`: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`. `translate` nunca se incluye |
| `DictionaryLoader`   | `() => Promise<any>`: carga un diccionario, o uno de sus locales                                                                                                 |
| `DictionaryLoaders`  | Loaders por nombre de diccionario. Con `lazy: "locale"` un diccionario asigna a cada locale su propio loader                                                     |
