# dialex import

Escribe las cadenas traducidas de un archivo de vuelta en los archivos fuente de tus diccionarios.

```bash
dialex import dialex-export/tr.json
dialex import dialex-export/translations.csv
dialex import translations/tr.xlf
dialex import --locale tr strings.json
```

| Opción                  | Descripción                                          |
| ----------------------- | ---------------------------------------------------- |
| `-f, --format <format>` | `json`, `csv` o `xliff` (se deduce de la extensión)  |
| `-l, --locale <locale>` | Locale para archivos de un solo locale               |
| `--allow-new`           | Añade claves que todavía no existen en ningún locale |
| `-c, --config <path>`   | Ruta de configuración personalizada                  |
| `--json`                | Imprime JSON legible por máquina y nada más          |

## Cómo se encuentran los locales

- **JSON**: un archivo plano como `tr.json` toma su locale del nombre del archivo o de `--locale`. Un archivo con la forma `{ "tr": { "home.title": "..." } }` lleva sus propios locales.
- **CSV**: la fila de cabecera nombra los locales (`key,en,tr`). Las celdas vacías se ignoran.
- **XLIFF**: el atributo `target-language`, o `--locale`.

## Comportamiento

- Las cadenas existentes se actualizan y las que faltan se añaden, en el archivo del diccionario, con las mismas ediciones sobre el árbol sintáctico que `check --fix`.
- Las claves que no existen en ningún locale se ignoran y se enumeran, salvo que pases `--allow-new`. Esto protege frente a erratas y exportaciones obsoletas.
- Los valores de tipo función nunca se sobrescriben; se informa de que se han dejado sin cambios.
- Los valores vacíos se omiten.
- Los mensajes [ICU](../guide/icu.md) se validan: un valor que no es ICU válido, o que usa argumentos distintos a los de la misma clave en otro locale, se rechaza y se enumera.

## Salida y código de salida

Con `--json` imprime un objeto:

```json
{
  "success": false,
  "created": 0,
  "updated": 8,
  "skipped": [],
  "rejected": ["tr:a.items (invalid ICU: ...)"],
  "unknown": [],
  "errors": []
}
```

| Campo      | Descripción                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `success`  | `false` cuando se rechazó al menos un valor                                                             |
| `created`  | Valores añadidos                                                                                        |
| `updated`  | Valores cambiados                                                                                       |
| `skipped`  | Valores de función u otros que no son texto, dejados sin cambios                                        |
| `rejected` | Valores rechazados, como `locale:key (motivo)`: ICU no válido, o argumentos que difieren de otro locale |
| `unknown`  | Claves que no existen en ningún locale y se ignoraron (añádelas con `--allow-new`)                      |
| `errors`   | Problemas al leer el archivo                                                                            |

El código de salida es `1` cuando el comando no puede ejecutarse (un archivo que falta, un formato desconocido). **Una ejecución que rechazó valores termina igualmente con `0`**: comprueba `success` o `rejected` en el JSON cuando un script deba detenerse ante valores rechazados.
