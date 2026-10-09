# dialex check

Verifica tus diccionarios y cómo los usa tu código. Termina con el código `1` cuando encuentra errores, por lo que encaja en hooks de pre-commit y en CI. Las advertencias nunca hacen fallar la ejecución.

```bash
dialex check
dialex check --json
dialex check --github
dialex check --fix
dialex lint -c ./dialex.config.ts
```

## Qué comprueba

**Errores**

- A un diccionario le falta un locale configurado.
- A un locale le falta una clave que otro locale tiene. Las claves anidadas se comparan por su ruta con puntos, por ejemplo `nav.about`.
- Una cadena que claramente usa [ICU](../guide/icu.md) (`plural`, `select`, `number`, ...) no es ICU válido, o un locale usa argumentos distintos a los del locale por defecto para la misma clave.
- El código fuente llama a `getDictionary("x")`, `useDictionary("x")` o `@DialexDictionary("x")` con un diccionario que no existe.
- El código fuente llama a `t("home.nav.missing")` con una ruta que no existe. Solo se comprueban las llamadas a `t()` cuyo primer segmento es el nombre de un diccionario conocido, de modo que se ignoran las funciones `t()` ajenas.

**Advertencias**

- Una clave posiblemente no se usa. Es una heurística: una clave se considera usada si su último segmento aparece en cualquier lugar de tu código como palabra, así que el acceso dinámico nunca provoca un error falso, y algunas claves sin usar pueden pasar desapercibidas.
- Un diccionario nunca se referencia.
- Un mensaje ICU usa `{placeholders}` simples pero no se analiza como ICU, o falta una opción de plural para un idioma (por ejemplo `few` en ruso).
- Una cadena aún empieza por `[TODO]`, dejado por `--fix` o por una traducción rechazada.

Las comprobaciones de referencias y de claves sin usar analizan `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`, omitiendo `node_modules`, la salida de compilación, `*.d.ts`, los archivos generados, los archivos de configuración y los propios diccionarios. Se omiten cuando no hay código fuente que analizar.

## Opciones

| Opción                | Descripción                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | Ruta de configuración personalizada                                                                              |
| `--json`              | Imprime JSON legible por máquinas (`success`, `totalIssues`, `totalWarnings`, `fixed`, `diagnostics`) y nada más |
| `--github`            | Imprime además anotaciones de GitHub Actions (`::error file=...,line=...::message`)                              |
| `--fix`               | Inserta las claves que faltan antes de comprobar                                                                 |
| `--src <globs...>`    | Globs de código fuente que analizar en lugar de los predeterminados                                              |

## --fix

Para cada clave que un locale tiene y otro no, `--fix` copia el valor del locale por defecto en el lugar que falta. Las cadenas reciben el prefijo `[TODO] ` para encontrarlas fácilmente; las funciones se copian tal como están escritas. Se crean los locales configurados que faltan. Las ediciones se hacen sobre el árbol sintáctico, así que se conservan los comentarios y el resto del archivo.

Ejecuta después [`dialex translate`](./translate.md) para sustituir los marcadores por traducciones reales.

## GitHub Actions

```yaml
- run: bunx dialex check --github
```

Los errores y las advertencias aparecen como anotaciones en los archivos y las líneas a las que se refieren.
