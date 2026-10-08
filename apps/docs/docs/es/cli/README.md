# CLI

`@dialexjs/cli` instala dos binarios: `dialexjs` y el alias `dx`.

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

Un flujo de trabajo típico: `dialex check --fix` para crear marcadores de posición para las claves nuevas, luego `dialex translate` o bien `dialex export` / `dialex import` para traductores humanos, y después `dialex check` en CI.
