# @dialexjs/mcp

Model Context Protocol (MCP) server for Dialex internationalization.

`@dialexjs/mcp` connects AI coding assistants (such as Claude Desktop, Cursor, and custom agent systems) directly to Dialex projects. It provides tools to read configs, inspect dictionaries, verify parity, and perform safe syntax-tree edits without running project code or spending translation API credits.

## Installation & Usage

Run directly via `npx`:

```bash
npx @dialexjs/mcp
```

Or pass a specific project root directory:

```bash
npx @dialexjs/mcp --root /path/to/project
```

## Adding to `.mcp.json`

Add the server to your project or user `.mcp.json`:

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

## Available Tools

### Read Tools (Never Executes Project Code)

- **`dialex_config`**: Reads static configuration (`locales`, `defaultLocale`, `include`) from `dialex.config.ts`.
- **`dialex_list_dictionaries`**: Lists all detected content dictionaries and their supported locales.
- **`dialex_get_dictionary`**: Returns all leaf keys and values for a given dictionary and locale.
- **`dialex_check`**: Statically analyzes parity and source references, returning issues with source positions.
- **`dialex_find_usages`**: Scans a source file for `getDictionary("name")` and `t("name.path")` calls.
- **`dialex_missing`**: Reports missing keys or keys still filled with `[TODO]` placeholders.

### Safe Edit Tools (Preserves AST & Code Formatting)

- **`dialex_set_key`**: Safely sets or updates a translation string. Refuses to overwrite non-`[TODO]` strings unless `overwrite: true` is passed.
- **`dialex_add_missing`**: Copies missing keys from the default locale as `[TODO]` stubs across all target locales.
- **`dialex_generate`**: Triggers code generation to update `dialex.generated.ts` and ambient type definitions (`dialex-env.d.ts`).

## Documentation Resources

The server exposes bundled documentation under `dialex://docs/<topic>`:

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## License

MIT © [awaiden](https://github.com/awaiden)
