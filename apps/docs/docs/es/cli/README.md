# CLI

`@dialexjs/cli` instala dos binarios: `dialex` y el alias más corto `dx`, útil en los scripts de `package.json` (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Comando                              | Alias  | Propósito                                                                     |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| [`dialex init`](./init.md)           |        | Prepara Dialex en un proyecto                                                 |
| [`dialex generate`](./generate.md)   | `gen`  | Compila los diccionarios y las declaraciones de tipos                         |
| [`dialex check`](./check.md)         | `lint` | Verifica la paridad de locales y cómo el código usa los diccionarios          |
| [`dialex export`](./export.md)       |        | Exporta las cadenas como JSON, CSV o XLIFF para los traductores               |
| [`dialex import`](./import.md)       |        | Escribe los archivos traducidos de vuelta en los diccionarios                 |
| [`dialex translate`](./translate.md) |        | Rellena las traducciones que faltan con un proveedor de traducción automática |
| [`dialex lock`](./lock.md)           |        | Registra las traducciones como al día con su origen                           |

Un flujo de trabajo típico: `dialex check --fix` para crear marcadores de posición para las claves nuevas, luego `dialex translate` o bien `dialex export` / `dialex import` para traductores humanos, y después `dialex check` en CI.

## Códigos de salida y JSON

| Comando                                           | Código de salida                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`, `export`, `translate`, `lock`, `init` | `0` si tiene éxito, `1` cuando el comando falla (un error de sintaxis, un formato desconocido, ningún proveedor...)                      |
| `check`                                           | `1` cuando encuentra errores; las advertencias nunca lo hacen fallar (`--fail-on-stale` convierte las traducciones obsoletas en errores) |
| `import`                                          | `1` cuando no puede ejecutarse. Termina con `0` incluso si rechazó valores; lee `success` en el JSON                                     |

`generate`, `check`, `export`, `import`, `translate` y `lock` aceptan `--json`: imprimen un objeto JSON y nada más, para que otro programa lo lea. La forma está en la página de cada comando; para `check` consulta también la [referencia de diagnósticos](../guide/diagnostics.md).
