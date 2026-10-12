# CLI

`@dialexjs/cli` instala dos binarios: `dialex` y el alias más corto `dx`, útil en los scripts de `package.json` (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Comando                                                      | Alias  | Propósito                                                                     |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| [`dialex init`](./init.md)                                   |        | Prepara Dialex en un proyecto                                                 |
| [`dialex generate`](./generate.md)                           | `gen`  | Compila los diccionarios y las declaraciones de tipos                         |
| [`dialex check`](./check.md)                                 | `lint` | Verifica la paridad de locales y cómo el código usa los diccionarios          |
| [`dialex export`](./export.md)                               |        | Exporta las cadenas como JSON, CSV o XLIFF para los traductores               |
| [`dialex import`](./import.md)                               |        | Escribe los archivos traducidos de vuelta en los diccionarios                 |
| [`dialex translate`](./translate.md)                         |        | Rellena las traducciones que faltan con un proveedor de traducción automática |
| [`dialex lock`](./translate.md#keeping-translations-in-sync) |        | Registra las traducciones como al día con su origen                           |

Un flujo de trabajo típico: `dialex check --fix` para crear marcadores de posición para las claves nuevas, luego `dialex translate` o bien `dialex export` / `dialex import` para traductores humanos, y después `dialex check` en CI.

## Binario nativo

En Linux, macOS y Windows (x64 y arm64) `dialex` y `dx` ejecutan un binario nativo escrito en Rust, que se instala con el paquete como dependencia opcional (`@dialexjs/cli-<platform>`). `generate` y `check` son entre 25 y 40 veces más rápidos que la implementación en Node en un proyecto con 1.000 diccionarios, y producen los mismos archivos y la misma salida byte a byte.

El binario nativo lee los diccionarios y la configuración desde el árbol de sintaxis. Cuando un comando necesita ejecutar el código de tu proyecto (una configuración que no es solo datos, un proveedor de `translate`, `runtime: true`, carga diferida, `--fix`, `--watch`) o no está implementado de forma nativa (`init`, `export`, `import`, `lock`, `translate`), entrega todo el comando a la CLI de Node, así que para ti nada cambia. Dos variables de entorno lo controlan:

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # native only: fail instead of falling back to Node
```
