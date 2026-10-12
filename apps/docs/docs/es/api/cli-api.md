# API de la CLI

`@dialexjs/cli/api` es la API programática sobre la que se construyen la [extensión de VS Code](../guide/vscode.md) y el servidor de lenguaje. Lee diccionarios y configuraciones desde el árbol de sintaxis y **no ejecuta código del proyecto**, salvo las dos funciones opcionales marcadas abajo.

```ts
import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
```

## Análisis

### `analyzeProject(options)`

```ts
function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult>;
```

Encuentra los diccionarios de un proyecto, comprueba la paridad de locales, los mensajes ICU, lo obsoleto según el archivo de bloqueo y las referencias del código fuente, y devuelve los problemas. `dialex check` es una capa fina sobre ella.

| Opción    | Tipo             | Por defecto           | Descripción                                                                                                                                                            |
| --------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`    | `string`         | —                     | La carpeta del proyecto. Obligatorio                                                                                                                                   |
| `config`  | `AnalysisConfig` | —                     | `defaultLocale`, `locales`, `include`, `exclude`. Obligatorio                                                                                                          |
| `src`     | `string[]`       | `DEFAULT_SOURCE_GLOB` | Globs de código fuente donde buscar referencias. Pasa `[]` para omitir la búsqueda                                                                                     |
| `runtime` | `boolean`        | `false`               | **Ejecuta código del proyecto.** Importa diccionarios que el árbol de sintaxis no puede describir (spreads, claves calculadas). Los editores deben dejarlo desactivado |
| `ignore`  | `string[]`       | —                     | Más globs de exclusión, relativos a `root` (proyectos anidados)                                                                                                        |
| `unused`  | `boolean`        | `true`                | Informar de claves y diccionarios posiblemente sin usar                                                                                                                |
| `lock`    | `boolean`        | `true`                | Informar de traducciones cuyo texto de origen cambió desde `dialex.lock.json`                                                                                          |
| `cache`   | `AnalysisCache`  | —                     | Reutiliza diccionarios analizados y fuentes escaneadas entre llamadas. Se ignora con `runtime`                                                                         |

El resultado:

| Campo                | Tipo                   | Descripción                                                   |
| -------------------- | ---------------------- | ------------------------------------------------------------- |
| `issues`             | `AnalysisIssue[]`      | Todo lo encontrado. Consulta la tabla de abajo                |
| `dictionaries`       | `AnalyzedDictionary[]` | Una entrada por diccionario legible                           |
| `files`              | `string[]`             | Rutas absolutas de cada archivo de diccionario que coincidió  |
| `sourceFilesScanned` | `number`               | Cuántos archivos fuente se escanearon en busca de referencias |

Una `AnalysisIssue` tiene `file`, `level` (`"error" \| "warning" \| "info"`), `code` ([consulta los códigos](../guide/diagnostics.md)), `message` y, cuando se conocen, `range` (`{ start, end }` base cero de `{ line, column }`), `dictionary`, `locale`, `path` y `sourceLocale` (para `missing-key`: un locale desde el que copiar la clave).

Un `AnalyzedDictionary` tiene `name`, `file`, `locales`, `leaves` (`locale -> ruta con puntos -> { kind, value? }`), `paths` (la unión de rutas con puntos) y, cuando se leyó de forma estática, `df` para editar.

### Otros exports de análisis

| Export                     | Descripción                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `createAnalysisCache()`    | Un `AnalysisCache` para quien llama durante mucho tiempo. Reutiliza lo que no ha cambiado (por fecha de modificación y tamaño) |
| `clearGitignore(cache)`    | Olvida las reglas de `.gitignore` en caché, por ejemplo tras cambiar un `.gitignore`                                           |
| `scanReferences(text)`     | Encuentra referencias del estilo `getDictionary("x")` y `t("x.y.z")` en texto fuente. Devuelve `{ kind, value, start, end }[]` |
| `relativeFile(root, file)` | Una ruta relativa a la raíz con barras normales, para mostrar                                                                  |
| `DEFAULT_SOURCE_GLOB`      | `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`                                                                            |

## Escanear archivos

| Export                                | Descripción                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scanFiles(root, patterns, options?)` | Encuentra archivos bajo `root`, omitiendo la salida de build, los excludes configurados y las rutas ignoradas por Git. Opciones: `kind`, `exclude`, `ignore`, `gitignore`, `gitignoreFilter` |
| `createGitignoreFilter(root)`         | Una función que indica si Git ignora una ruta absoluta, leyendo los `.gitignore` del proyecto, de sus padres y de las carpetas anidadas                                                      |
| `BUILTIN_IGNORE`                      | Carpetas que nunca contienen diccionarios ni fuentes                                                                                                                                         |
| `SOURCE_BUILTIN_IGNORE`               | Lo que el escaneo de fuentes omite además: salida de otras herramientas, declaraciones, archivos generados y de configuración                                                                |

## Editar diccionarios

Los ayudantes trabajan sobre el árbol de sintaxis y conservan el resto del archivo, comentarios y formato incluidos.

| Export                                                     | Descripción                                                                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDictionaryText(file, text)`                          | Analiza el texto fuente de un diccionario (un búfer sin guardar, por ejemplo). `undefined` si la forma no es editable; lanza ante errores de sintaxis |
| `loadDictionaryFile(file)`                                 | Carga un archivo. `undefined` si su forma no es editable                                                                                              |
| `renderDictionaryFile(df)`                                 | El texto fuente con todas las ediciones aplicadas, sin escribir                                                                                       |
| `saveDictionaryFile(df)`                                   | Escribe el archivo editado                                                                                                                            |
| `listLocales(df)`, `listLeaves(df, locale)`                | Los locales, y cada hoja `{ path, kind, value? }` de un locale en orden de origen                                                                     |
| `hasPath(df, locale, path)`, `getString(df, locale, path)` | Si existe una clave, y su valor de cadena                                                                                                             |
| `setString(df, locale, path, value)`                       | Establece o crea una cadena. Devuelve `"created"`, `"updated"` o `"skipped"` (las funciones nunca se sobrescriben)                                    |
| `copyLeaf(df, from, to, path, mapString?)`                 | Copia una hoja entre locales, reescribiendo opcionalmente las cadenas. `false` si no hay nada que copiar o el destino ya tiene la clave               |
| `locationOf(df, locale, path?)`                            | El rango del nombre de propiedad de un locale o de una clave                                                                                          |
| `dictionaryLocation(df)`                                   | El rango del objeto cuyas claves son locales                                                                                                          |
| `getLeafSource(df, locale, path)`                          | El código fuente del valor de una hoja                                                                                                                |
| `TODO_PREFIX`                                              | `"[TODO] "`: lo que `--fix` antepone a las cadenas copiadas                                                                                           |

## Configuración

| Export                           | Descripción                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readStaticConfig(root, file?)`  | Lee `dialex.config.*` desde su árbol de sintaxis: `{ config, file?, notes }`. `notes` lista los ajustes que no son literales y se dejaron en sus valores por defecto |
| `parseStaticConfig(text, file?)` | Lo mismo para texto fuente                                                                                                                                           |
| `DEFAULT_STATIC_CONFIG`          | Los valores por defecto usados cuando un ajuste no se puede leer                                                                                                     |

## Proyectos y generación

| Export                                                          | Descripción                                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `loadStaticProject(root, configFile?)`                          | La configuración (desde el árbol de sintaxis) y cada archivo de diccionario, listos para leer y editar. No ejecuta código del proyecto |
| `loadProject(root, configFile?)`                                | **Ejecuta código del proyecto**: evalúa `dialex.config.*` antes de cargar los diccionarios                                             |
| `toKey(dictionary, path)`                                       | `("home", ["nav", "about"])` se convierte en `"home.nav.about"`                                                                        |
| `renderGenerated(root, options?)`                               | Calcula `dialex.generated.ts` y `dialex-env.d.ts` sin escribir, para ver si están al día                                               |
| `generateDictionaries(root, options?)`                          | Escribe los archivos generados. `options.static` lee la configuración sin ejecutarla                                                   |
| `startGenerateWatcher(root, options, regenerate, delay?, log?)` | Regenera cuando se añade, edita o elimina un archivo de diccionario o de configuración                                                 |

## Archivo de bloqueo

| Export                                    | Descripción                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `LOCK_FILE`                               | `"dialex.lock.json"`                                                                                         |
| `readLock(root)`, `writeLock(root, lock)` | Lee el archivo de bloqueo (o `undefined`) y lo escribe con las claves ordenadas                              |
| `hashSource(text)`                        | La huella corta que se guarda para una cadena de origen                                                      |
| `isStale(lock, locale, key, text)`        | `true` cuando la clave se registró a partir de otro texto de origen. Una clave sin registro no está obsoleta |

## Tipos

`AnalysisCache`, `AnalysisConfig`, `AnalysisIssue`, `AnalysisOptions`, `AnalysisResult`, `AnalyzedDictionary`, `IssueCode`, `IssueLevel`, `LeafInfo`, `Reference`, `ScanOptions`, `Lockfile`, `DictionaryFile`, `Leaf`, `LeafKind`, `SourceRange`, `StaticConfig`, `StaticConfigResult`, `Project`, `ProjectDictionary`, `GenerateOptions`, `RenderedGenerate`.
