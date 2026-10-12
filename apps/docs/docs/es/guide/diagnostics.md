# Referencia de diagnósticos

Cada problema que Dialex informa tiene un código, una gravedad y un mensaje. Las mismas comprobaciones se ejecutan en [`dialex check`](../cli/check.md), en la [extensión de VS Code](./vscode.md) y en el [servidor de lenguaje](./zed.md), así que un problema se ve igual en todas partes.

## Gravedades

| Gravedad  | Significado                                            | En `dialex check`                                                                           | En el editor |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------ |
| `error`   | Algo está mal y fallará en ejecución o en la revisión  | Código de salida `1`                                                                        | Error        |
| `warning` | Algo probablemente está mal o quedó sin terminar       | Se informa, código de salida `0` (`--fail-on-stale` convierte `stale-translation` en error) | Advertencia  |
| `info`    | Un archivo no se puede analizar, lo que no es un error | No se muestra                                                                               | Información  |

`unused-key` y `unused-dictionary` son advertencias en `check`; los editores las muestran como texto atenuado (una pista) para que no saturen el panel de problemas, y solo cuando el ajuste `unusedKeys` está activado.

## Archivos de diccionario

| Código               | Gravedad | Mensaje                                                                                 | Significado y solución                                                                                                                                                                                                                        |
| -------------------- | -------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-dictionary` | error    | `Failed to parse dictionary: ...`                                                       | El archivo tiene un error de sintaxis. Corrígelo; el mensaje indica dónde                                                                                                                                                                     |
| `invalid-dictionary` | error    | `Default export does not appear to be a valid defineDictionary output.`                 | Solo con análisis `runtime`. `export default` debe ser `defineDictionary(...)`                                                                                                                                                                |
| `invalid-locale`     | error    | `Locale "x" content is empty or invalid.`                                               | Solo con análisis `runtime`. El contenido de un locale debe ser un objeto                                                                                                                                                                     |
| `unanalyzable`       | info     | `This dictionary uses spreads, computed keys, imported values, or a computed name, ...` | Las herramientas estáticas no pueden leer el archivo. `dialex check` lo ejecuta en su lugar; los editores lo omiten. Usa objetos literales para tener soporte del editor (consulta [Diccionarios](./dictionaries.md#what-the-tools-can-read)) |
| `missing-locale`     | error    | `Missing configured locale "de"`                                                        | Un locale de `locales` no tiene contenido en este diccionario. Añádelo o ejecuta `dialex check --fix`                                                                                                                                         |
| `missing-key`        | error    | `Locale "tr" is missing key "nav.about"`                                                | Otro locale tiene la clave. Añádela, ejecuta `--fix` (copia el valor con marca `[TODO]`) o usa la corrección rápida del editor                                                                                                                |
| `todo-placeholder`   | warning  | `Locale "tr" key "title" still has a [TODO] placeholder`                                | Un valor aún empieza por `[TODO] `, dejado por `--fix`. Tradúcelo o ejecuta [`dialex translate`](../cli/translate.md)                                                                                                                         |
| `stale-translation`  | warning  | `Locale "tr" key "title" is out of date: the "en" text changed after it was translated` | El texto de origen cambió después de registrarse la traducción en `dialex.lock.json`. Actualiza la traducción y luego ejecuta `dialex lock`                                                                                                   |

## Mensajes ICU

| Código                  | Gravedad | Mensaje                                                                                                                      | Significado y solución                                                                                                               |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `invalid-icu`           | error    | `Invalid ICU message "a.items" (tr): ICU syntax error at 27: Missing required "other" option`                                | La cadena usa `plural`, `select`, `number`... y no se analiza. El mensaje da la posición. Plural y select necesitan una rama `other` |
| `invalid-icu`           | warning  | `"a.soft" (en) contains braces but is not valid ICU, so t() values cannot be applied: ...`                                   | Una cadena con llaves simples no se analiza, así que `t()` la devolvería sin cambios. Entrecomilla las llaves literales: `'{'`       |
| `icu-args-mismatch`     | error    | `Locale "tr" uses different arguments than "en" for "a.greeting" (expected name:any, found ad:any)`                          | Las traducciones de una clave deben usar los mismos nombres de argumento. Renombra el argumento en la traducción                     |
| `icu-plural-categories` | warning  | `Locale "ru" plural "count" in "a.items" has no "few", "many" option (used by this language; "other" will be shown instead)` | El idioma necesita más categorías de plural de las que da el mensaje. Añádelas                                                       |

## Código fuente

Necesitan archivos fuente que escanear; se omiten cuando no hay ninguno. Lo que se escanea está en [`dialex check`](../cli/check.md#what-it-checks).

| Código               | Gravedad | Mensaje                              | Significado y solución                                                                                                                                                            |
| -------------------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-dictionary` | error    | `Unknown dictionary "zzz"`           | `getDictionary("zzz")`, `useDictionary("zzz")` o `@DialexDictionary("zzz")` nombra un diccionario que no existe                                                                   |
| `unknown-path`       | error    | `Unknown translation path "a.nope"`  | `t("a.nope")` donde `a` es un diccionario conocido sin esa clave. El editor ofrece una corrección rápida que añade la clave a cada locale                                         |
| `unused-key`         | warning  | `Key "only_en" is possibly unused`   | Ningún archivo fuente contiene el último segmento de la clave como palabra. Es una heurística: el acceso dinámico nunca se informa y algunas claves sin usar pasan desapercibidas |
| `unused-dictionary`  | warning  | `Dictionary "c" is never referenced` | Ningún archivo fuente contiene el nombre del diccionario                                                                                                                          |

Los comentarios nunca se comprueban. Un diccionario registrado en el código con un literal de objeto, `dictionaries: { name: ... }`, se considera conocido, así que leerlo con `getDictionary("name")` no es un error. Para silenciar una referencia correcta, escriba `dialex-ignore-next-line` en un comentario de la línea anterior, o `dialex-ignore` en un comentario de la misma línea:

```ts
// dialex-ignore-next-line
const d = getDictionary("from-a-plugin");
```

Para las mismas comprobaciones en ESLint y oxlint, consulte [Linting](./linting.md).

## Archivos generados

`dialex check` también compara `dialex.generated.ts` y `dialex-env.d.ts` con lo que escribiría `dialex generate`, ignorando el formato. Este problema no tiene código:

| Gravedad | Mensaje                                                                                | Solución                  |
| -------- | -------------------------------------------------------------------------------------- | ------------------------- |
| error    | `Out of date with your dictionaries or config. Run `dx generate`(or`dx check --fix`).` | Ejecuta `dialex generate` |

## Formatos de salida

La salida **para personas** agrupa los problemas por archivo, con el número de línea tras cada mensaje.

**`--json`** imprime un objeto y nada más:

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/features/a/a.content.ts",
      "name": "a",
      "errors": ["Missing configured locale \"de\""],
      "warnings": ["Key \"only_en\" is possibly unused"],
      "annotations": [
        { "level": "error", "message": "Missing configured locale \"de\"", "line": 3 }
      ]
    }
  ],
  "totalIssues": 1,
  "totalWarnings": 1,
  "fixed": 0
}
```

| Campo           | Descripción                                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`       | `false` cuando hay al menos un error. El código de salida es `1` en ese caso                                                                                                                             |
| `diagnostics`   | Una entrada por archivo con problema: `file` (relativo al proyecto), `name` (el diccionario, si lo es), `errors`, `warnings` y `annotations` (`level`, `message`, `line` basada en uno cuando se conoce) |
| `totalIssues`   | El número de errores                                                                                                                                                                                     |
| `totalWarnings` | El número de advertencias                                                                                                                                                                                |
| `fixed`         | Cuántos valores insertó `--fix`                                                                                                                                                                          |

**`--github`** imprime un comando de workflow por anotación (`::error file=...,line=...,title=dialex::message`), que GitHub muestra en los archivos de un pull request.
