# Binarios nativos

`dialex generate`, `dialex check` y el servidor de lenguaje tienen una implementación nativa escrita en Rust. Lee los mismos diccionarios y configuraciones, desde el árbol de sintaxis, y produce **los mismos archivos y la misma salida byte a byte**; solo es más rápida. Todos los demás comandos, y todo caso que el código nativo no puede decidir por sí solo, se ejecutan en la CLI de Node como siempre. No tienes que elegir: instala `@dialexjs/cli` y ocurre lo correcto.

## Velocidad

Medido con los mejores de 5 procesos nuevos en una máquina (un Intel Core i5-11400H); tus números serán distintos, así que ejecuta `apps/benchmarks/cli/run.mjs` para comparar en tu hardware.

| Proyecto           | Comando    | CLI de Node | Binario nativo |
| ------------------ | ---------- | ----------: | -------------: |
| 100 diccionarios   | `generate` |      341 ms |         4,3 ms |
| 100 diccionarios   | `check`    |      492 ms |         8,9 ms |
| 1.000 diccionarios | `generate` |    1.107 ms |          28 ms |
| 1.000 diccionarios | `check`    |    2.149 ms |          88 ms |

El servidor de lenguaje analiza 1.000 diccionarios en unos 50 ms en lugar de unos 2,7 s, y vuelve a analizar tras una edición en unos 20 ms.

## Qué plataformas

Los binarios precompilados se publican como dependencias opcionales de `@dialexjs/cli`:

| Plataforma                  | Paquete                                                  |
| --------------------------- | -------------------------------------------------------- |
| Linux x64 y arm64 (glibc)   | `@dialexjs/cli-linux-x64`, `@dialexjs/cli-linux-arm64`   |
| macOS Intel y Apple silicon | `@dialexjs/cli-darwin-x64`, `@dialexjs/cli-darwin-arm64` |
| Windows x64 y arm64         | `@dialexjs/cli-win32-x64`, `@dialexjs/cli-win32-arm64`   |

Alpine Linux (musl) y otras plataformas no tienen binario y usan la CLI de Node. Lo mismo ocurre con una instalación con `--no-optional`.

## Cómo se elige

`dx` es un pequeño launcher. Si el paquete de la plataforma está instalado, ejecuta el binario; si no, ejecuta la CLI de Node. Con npm y Yarn classic, en Linux y macOS, el paso de instalación va más allá y coloca el binario donde estaba el launcher, así que `dx` arranca sin iniciar Node primero (menos de 1 ms en lugar de unos 25 ms). Con `--ignore-scripts`, pnpm, Bun (que bloquea los scripts de ciclo de vida por defecto) o Windows, el launcher permanece y ejecuta el mismo binario.

## Qué se ejecuta de forma nativa

| Comando                                         | Nativo                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `dialex generate`                               | Sí, en proyectos eager (no lazy) con `-o`, `-c` y `--json`      |
| `dialex check`                                  | Sí, con `-c`, `--json`, `--github`, `--fail-on-stale` y `--src` |
| `--version`                                     | Sí                                                              |
| Servidor de lenguaje                            | Sí, opcional con `DIALEX_NATIVE=1` (consulta más abajo)         |
| `init`, `export`, `import`, `lock`, `translate` | No: CLI de Node                                                 |
| `generate --watch`, `check --fix`, carga `lazy` | No: CLI de Node                                                 |

Un comando también se ejecuta en Node cuando el código nativo encuentra algo que no debe adivinar:

- un `dialex.config.*` con spreads, claves calculadas o valores que no son literales (la CLI de Node ejecuta el archivo);
- un diccionario con spreads, claves calculadas, valores importados o un nombre calculado;
- un glob o una etiqueta de locale que no puede interpretar con exactitud.

El resultado es siempre el mismo que sin el binario nativo; solo que no es más rápido.

## Variables de entorno

| Variable                                            | La usa                      | Efecto                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIALEX_NATIVE=0`                                   | CLI, servidor de lenguaje   | Usar siempre la implementación de Node                                                                                                                                                                                                                                     |
| `DIALEX_NATIVE=1`                                   | CLI                         | Cuando `generate` o `check` no se pueden hacer de forma nativa, termina con código 1 y un motivo en lugar de ejecutarse en Node. Útil en CI para detectar un diccionario que pierde en silencio la aceleración. Los comandos solo de Node se ejecutan en Node como siempre |
| `DIALEX_NATIVE=1`                                   | servidor de lenguaje        | Ejecuta el servidor nativo. Sin ella se ejecuta el servidor de Node                                                                                                                                                                                                        |
| `DIALEX_BINARY=/path/to/dx`                         | launcher de la CLI          | Usa este binario en lugar del paquete de plataforma instalado                                                                                                                                                                                                              |
| `DIALEX_LSP_BINARY=/path/to/dialex-language-server` | `@dialexjs/language-server` | Usa este binario de servidor                                                                                                                                                                                                                                               |
| `DIALEX_NODE_CLI=/path/to/index.mjs`                | binario nativo              | La CLI de Node a la que entregar comandos. La establece el launcher; defínela tú solo cuando ejecutes el binario por separado                                                                                                                                              |
| `DIALEX_SKIP_NATIVE_INSTALL=1`                      | paso de instalación         | Mantiene el launcher de JavaScript en lugar de sustituirlo por el binario                                                                                                                                                                                                  |
| `NO_COLOR`                                          | CLI                         | Imprime sin colores                                                                                                                                                                                                                                                        |

## Usar el servidor de lenguaje nativo

El servidor de lenguaje es opcional por ahora. Define `DIALEX_NATIVE=1` en el entorno que lo inicia; `@dialexjs/language-server` ejecuta entonces el binario del paquete de plataforma. En Zed puedes en su lugar definir `lsp.dialex.binary.path` con el binario. Ofrece los mismos diagnósticos, hover, ir a la definición, autocompletado y correcciones rápidas que el servidor de Node. No regenera `dialex.generated.ts` en proyectos con carga diferida; ejecuta `dialex generate` para ellos.

## Comprobar cuál se ejecutó

`dialex --version` imprime el mismo número en ambos casos. Para ver si un comando se hizo de forma nativa, ejecútalo con `DIALEX_NATIVE=1`: si imprime su salida normal, se ejecutó de forma nativa; si termina con `dialex: native check declined: ...`, el motivo está en el mensaje y sin la variable se habría ejecutado en Node.
