# dialex export

Escribe las cadenas de tus diccionarios en archivos con los que los traductores pueden trabajar, sin tocar TypeScript.

```bash
dialex export                      # JSON, into ./i18n-export
dialex export -f csv
dialex export -f xliff -o translations
dialex export -l tr de
```

| Opción                      | Descripción                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `-f, --format <format>`     | `json` (por defecto), `csv` o `xliff`                                            |
| `-o, --out <dir>`           | Directorio de salida (por defecto `i18n-export`)                                 |
| `-l, --locale <locales...>` | Limita la exportación a estos locales (el locale por defecto siempre se incluye) |
| `-c, --config <path>`       | Ruta de configuración personalizada                                              |

## Formatos

Las claves son rutas con puntos precedidas por el nombre del diccionario, por ejemplo `home.nav.about`.

- **JSON**: un archivo plano por locale, `en.json`, `tr.json`, ... con `{ "home.title": "Welcome" }`.
- **CSV**: un único `translations.csv` con una columna `key` y una columna por locale. Las celdas vacías son traducciones que faltan.
- **XLIFF 1.2**: un `<locale>.xlf` por cada locale que no sea el predeterminado, con el texto del locale por defecto como `<source>` y el texto del locale como `<target>`. Las traducciones que faltan no tienen `<target>`.

Solo se exportan valores de cadena simples. Los valores de tipo función, como `(name) => \`Hello ${name}\``, no se pueden traducir como texto y se cuentan y se informan como omitidos. Las claves no pueden contener puntos en sus propios nombres.

Recupera las traducciones con [`dialex import`](./import.md).
