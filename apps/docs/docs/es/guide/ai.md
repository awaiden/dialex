# Asistentes de IA y MCP

Dialex está diseñado para funcionar perfectamente con asistentes de programación con IA como Claude, Cursor, ChatGPT y Codex. Proporciona un servidor de Model Context Protocol (MCP) dedicado, habilidades (skills) de agente instalables, salida JSON legible por máquina en todos los comandos CLI y configuración automática.

## Configuración con `dialex init`

Al configurar Dialex en un proyecto nuevo, ejecute:

```bash
dialex init --ai
```

Esto realizará automáticamente lo siguiente:

1. Instalar y registrar el servidor MCP de Dialex en `.mcp.json`.
2. Agregar la definición de habilidad de Dialex a `.claude/skills/dialex/SKILL.md`.
3. Agregar las pautas principales de internacionalización a `AGENTS.md`.

## Servidor MCP (`@dialexjs/mcp`)

El paquete `@dialexjs/mcp` se ejecuta a través de stdio y expone herramientas que inspeccionan diccionarios, verifican la paridad y realizan ediciones seguras en el árbol sintáctico. Nunca ejecuta código del proyecto y nunca llama a API de traducción de pago.

### Configuración

Agregue Dialex a su archivo `.mcp.json`:

```json
{
  "mcpServers": {
    "dialex": {
      "command": "npx",
      "args": ["@dialexjs/mcp"]
    }
  }
}
```

### Herramientas disponibles

| Herramienta                | Tipo        | Descripción                                                                                         |
| -------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `dialex_config`            | Lectura     | Lee la configuración estática (`locales`, `defaultLocale`) sin ejecutar código                      |
| `dialex_list_dictionaries` | Lectura     | Enumera todos los archivos de diccionario descubiertos y sus locales                                |
| `dialex_get_dictionary`    | Lectura     | Devuelve claves y valores de traducción por locale                                                  |
| `dialex_check`             | Lectura     | Ejecuta el análisis de paridad y referencias, devolviendo problemas y anotaciones                   |
| `dialex_find_usages`       | Lectura     | Analiza un archivo en busca de llamadas a diccionarios (`getDictionary`, `t(...)`)                  |
| `dialex_missing`           | Lectura     | Enumera claves faltantes o que aún contienen marcadores `[TODO]`                                    |
| `dialex_set_key`           | Edición     | Establece de forma segura una cadena mediante AST; evita sobrescribir a menos que `overwrite: true` |
| `dialex_add_missing`       | Edición     | Inserta claves faltantes en todos los locales como marcadores `[TODO]`                              |
| `dialex_generate`          | Herramienta | Regenera `i18n.generated.ts` y `dialex-env.d.ts`                                                    |

### Recursos de documentación

El servidor proporciona recursos integrados en markdown bajo `dialex://docs/<topic>`:

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## Habilidades de agente

Dialex publica habilidades compatibles con la CLI `skills`:

```bash
npx skills add awaiden/dialex
```

Se incluyen dos habilidades:

- `dialex`: Conceptos básicos, estructura de diccionarios y patrones de adaptadores para frameworks.
- `dialex-translate`: Flujo de trabajo para detectar traducciones faltantes, insertar marcadores y verificar la paridad ICU.

## Salida JSON legible por máquina

Todos los comandos CLI de Dialex admiten `--json` para su integración en procesos automatizados y agentes de IA:

```bash
dialex check --json
dialex generate --json
dialex export --json
dialex import translations.json --json
dialex translate --dry-run --json
```

La salida se emite a stdout como JSON estructurado, mientras que los registros y las advertencias se suprimen. En caso de error, el proceso finaliza con un código distinto de cero.
