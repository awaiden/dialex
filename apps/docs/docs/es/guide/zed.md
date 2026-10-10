# Zed y otros editores

Dialex tiene un servidor de lenguaje, [`@dialexjs/language-server`](https://www.npmjs.com/package/@dialexjs/language-server), que habla el Language Server Protocol. Los editores que lo admiten obtienen los diagnósticos, el hover, ir a la definición, el autocompletado y las correcciones rápidas de Dialex sin un plugin propio. Para Zed hay una extensión que lo encuentra y lo inicia. La extensión de VS Code se describe en [Extensión de VS Code](./vscode.md).

::: warning Estado
El servidor de lenguaje se prueba contra un cliente LSP y la extensión de Zed compila, pero **todavía no se ha probado en una ventana real de Zed** y no está en el registro de extensiones de Zed. Instálala como extensión de desarrollo e informa de cualquier cosa que parezca incorrecta.
:::

## Zed

Instala la extensión desde el repositorio (está en `packages/zed`): ejecuta **zed: install dev extension** en la paleta de comandos de Zed y elige esa carpeta. Necesita Rust con el target `wasm32-wasip2`.

La extensión busca el servidor en tu proyecto (`@dialexjs/language-server` en `package.json`), luego en tu `PATH`, y si no instala y actualiza una copia propia con npm. Solo se inicia en proyectos con un archivo `dialex.config.*` o con `dialexjs` en `package.json`.

Los ajustes van en la configuración de Zed, bajo `lsp.dialex`:

```json
{
  "lsp": {
    "dialex": {
      "settings": {
        "unusedKeys": false,
        "autoGenerate": true,
        "configPath": ""
      }
    }
  }
}
```

Si el servidor no se inicia para archivos TypeScript, añádelo a la lista de servidores del lenguaje:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## Otros editores

Cualquier cliente LSP puede ejecutar el servidor por stdio:

```bash
npx @dialexjs/language-server --stdio
```

Neovim 0.11 o posterior:

```lua
vim.lsp.config("dialex", {
  cmd = { "npx", "@dialexjs/language-server", "--stdio" },
  filetypes = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  root_markers = { "dialex.config.ts", "package.json" },
})
vim.lsp.enable("dialex")
```

Helix, en `languages.toml`:

```toml
[language-server.dialex]
command = "npx"
args = ["@dialexjs/language-server", "--stdio"]

[[language]]
name = "typescript"
language-servers = ["typescript-language-server", "dialex"]
```

::: warning Recetas sin probar
Estos dos fragmentos siguen la configuración documentada de cada editor, pero no se han ejecutado en los editores reales. Compruébalos con la documentación de tu versión.
:::

## Funciones

El servidor ofrece:

| Función              | Qué obtienes                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnósticos         | Claves y locales que faltan, [ICU](./icu.md) no válido, marcadores `[TODO]`, traducciones desactualizadas y llamadas `getDictionary("x")` o `t("x.y")` que apuntan a algo que no existe |
| Hover                | El texto de una clave en cada locale                                                                                                                                                    |
| Ir a la definición   | Salta a donde el diccionario escribe la clave                                                                                                                                           |
| Autocompletado       | Nombres de diccionario y rutas de clave dentro de `t("...")` y `getDictionary("...")`                                                                                                   |
| Correcciones rápidas | Copiar una clave que falta a un locale (marcada `[TODO]`), añadir todas las claves que faltan o crear una clave a la que el código hace referencia                                      |
| Archivos generados   | Regenera `dialex.generated.ts` cuando cambia un diccionario o la configuración, en proyectos que ya tienen uno                                                                          |

## Ajustes

El servidor los lee de la sección `dialex` de la configuración del editor:

| Ajuste         | Por defecto | Descripción                                                                               |
| -------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `enable`       | `true`      | Desactivar todas las funciones                                                            |
| `unusedKeys`   | `false`     | Atenuar claves y diccionarios que ningún archivo fuente parece usar                       |
| `autoGenerate` | `true`      | Regenerar `dialex.generated.ts` cuando cambian los diccionarios o la configuración        |
| `configPath`   | —           | Archivo de configuración relativo a la raíz de cada proyecto; vacío usa `dialex.config.*` |

## Límites

- Los diccionarios y las configuraciones se leen del árbol sintáctico, así que el servidor nunca ejecuta el código de tu proyecto. Los diccionarios con spreads o claves calculadas no se pueden analizar y muestran una nota informativa; ejecuta `dialex check` para esos.
- Los archivos generados solo se actualizan en proyectos que ya tienen uno. Ejecuta `dialex generate` una vez para crearlo.
- No hay comandos del editor: la regeneración es automática.
