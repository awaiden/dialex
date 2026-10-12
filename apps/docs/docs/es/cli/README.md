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

## Binario nativo

En Linux, macOS y Windows (x64 y arm64) `dialex` y `dx` ejecutan un binario nativo escrito en Rust, que se instala con el paquete como dependencia opcional (`@dialexjs/cli-<platform>`). `generate` y `check` son entre 25 y 40 veces más rápidos que la implementación en Node en un proyecto con 1.000 diccionarios, y producen los mismos archivos y la misma salida byte a byte.

El binario nativo lee los diccionarios desde su árbol de sintaxis y la configuración desde `.dialex/config.json`. Cuando un comando necesita ejecutar el código de tu proyecto (una configuración que no es solo datos, un proveedor de `translate`, `runtime: true`, carga diferida, `--fix`, `--watch`) o no está implementado de forma nativa (`init`, `export`, `import`, `lock`, `translate`), entrega todo el comando a la CLI de Node, así que para ti nada cambia. Dos variables de entorno lo controlan:

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # fail with a reason instead of running in Node
```

Con npm y Yarn classic en Linux y macOS, el paso de instalación coloca el binario donde estaba el launcher, así que `dx` arranca en menos de un milisegundo en lugar de iniciar Node primero (unos 25 ms). Otros gestores de paquetes, `--ignore-scripts` y Windows conservan un pequeño launcher de JavaScript que ejecuta el mismo binario.

Las plataformas admitidas, qué se ejecuta de forma nativa, cuándo se recurre a Node y cada variable de entorno están en [Binarios nativos](../guide/native.md).

## Códigos de salida y JSON

| Comando                                           | Código de salida                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`, `export`, `translate`, `lock`, `init` | `0` si tiene éxito, `1` cuando el comando falla (un error de sintaxis, un formato desconocido, ningún proveedor...)                      |
| `check`                                           | `1` cuando encuentra errores; las advertencias nunca lo hacen fallar (`--fail-on-stale` convierte las traducciones obsoletas en errores) |
| `import`                                          | `1` cuando no puede ejecutarse. Termina con `0` incluso si rechazó valores; lee `success` en el JSON                                     |

`generate`, `check`, `export`, `import`, `translate` y `lock` aceptan `--json`: imprimen un objeto JSON y nada más, para que otro programa lo lea. La forma está en la página de cada comando; para `check` consulta también la [referencia de diagnósticos](../guide/diagnostics.md).
