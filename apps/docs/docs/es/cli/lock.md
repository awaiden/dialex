# dialex lock

Registra las traducciones que tienes como al día con su texto de origen actual, para que se pueda notar una edición posterior del origen. Escribe `dialex.lock.json`, junto a tu configuración.

```bash
dialex lock                  # adopt the lock file; leave out-of-date translations alone
dialex lock --all            # also accept translations that are already out of date
dialex lock -s en --json
```

| Opción                  | Descripción                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `-s, --source <locale>` | El locale desde el que se hicieron las traducciones. Por defecto: `translate.sourceLocale`, luego `defaultLocale` |
| `--all`                 | Registra también las traducciones que ya están desactualizadas (las acepta tal como están)                        |
| `--json`                | Imprime JSON legible por máquina                                                                                  |
| `-c, --config <path>`   | Ruta de configuración personalizada                                                                               |

## Qué hace

Para cada cadena de un locale distinto del de origen, guarda un hash corto del texto del locale de origen para la misma clave, salvo que:

- el valor todavía empiece por `[TODO] ` (aún no está traducido);
- el texto de origen haya cambiado desde que se hizo un registro y no se haya dado `--all` (está desactualizado, así que se lista);
- el valor sea una función u otro valor que no es una cadena.

Ejecútalo una vez cuando adoptes el archivo de bloqueo, y de nuevo después de revisar las traducciones que [`dialex check`](./check.md) informó como desactualizadas. [`dialex translate`](./translate.md) y [`dialex import`](./import.md) registran lo que escriben, así que no necesitas `lock` después de ellos.

Si el archivo de bloqueo se escribió desde otro locale de origen, no dice nada sobre este y se empieza uno nuevo.

## Salida

```json
{ "success": true, "sourceLocale": "en", "recorded": 5, "stale": [] }
```

| Campo          | Descripción                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| `success`      | `true` salvo que el comando fallara (una configuración ilegible, por ejemplo) |
| `sourceLocale` | El locale de origen usado                                                     |
| `recorded`     | Cuántas traducciones se registraron de nuevo como al día                      |
| `stale`        | Claves que siguen desactualizadas y se dejaron como están (solo sin `--all`)  |

El código de salida es `0`, y `1` cuando el comando no pudo ejecutarse.

## El archivo

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

Las claves están ordenadas, así que el archivo produce diffs pequeños y estables. Confírmalo en el repositorio, para que todo el equipo vea el mismo estado. Una traducción sin registro, como una escrita a mano, nunca se informa como desactualizada.
