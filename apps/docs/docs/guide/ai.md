# AI Assistants & MCP

Dialex is built to work seamlessly with AI coding assistants like Claude, Cursor, ChatGPT, and Codex. It provides a dedicated Model Context Protocol (MCP) server, installable agent skills, machine-readable JSON output on all CLI commands, and automated setup.

## Setup with `dialex init`

When setting up Dialex in a new project, run:

```bash
dialex init --ai
```

This will automatically:

1. Install and register the Dialex MCP server in `.mcp.json`.
2. Add the Dialex skill definition to `.agents/skills/dialex/SKILL.md`.
3. Add key internationalization guidelines to `AGENTS.md`.

## MCP Server (`@dialexjs/mcp`)

The `@dialexjs/mcp` package runs over stdio and exposes tools that inspect dictionaries, check parity, and perform safe syntax-tree edits. It never executes project code and never calls paid translation APIs.

### Configuration

Add Dialex to your `.mcp.json`:

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

### Available Tools

| Tool                       | Type | Description                                                                  |
| -------------------------- | ---- | ---------------------------------------------------------------------------- |
| `dialex_config`            | Read | Reads static configuration (`locales`, `defaultLocale`) without running code |
| `dialex_list_dictionaries` | Read | Lists all discovered dictionary files and their locales                      |
| `dialex_get_dictionary`    | Read | Returns translation leaf keys and values per locale                          |
| `dialex_check`             | Read | Runs parity and reference analysis, returning issues and annotations         |
| `dialex_find_usages`       | Read | Scans a file for dictionary calls (`getDictionary`, `t(...)`)                |
| `dialex_missing`           | Read | Lists keys that are missing or still contain `[TODO]` placeholders           |
| `dialex_set_key`           | Edit | Safely sets a string via AST; prevents overwriting unless `overwrite: true`  |
| `dialex_add_missing`       | Edit | Inserts missing keys across locales as `[TODO]` stubs                        |
| `dialex_generate`          | Tool | Regenerates `dialex.generated.ts` and `dialex-env.d.ts`                      |

### Documentation Resources

The server provides built-in markdown resources under `dialex://docs/<topic>`:

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## Agent Skills

Dialex publishes skills compatible with `skills` CLI:

```bash
npx skills add awaiden/dialex
```

Two skills are included:

- `dialex`: Core concepts, dictionary structure, and framework adapter patterns.
- `dialex-translate`: Workflow for detecting missing translations, inserting stubs, and verifying ICU parity.

## Machine-Readable JSON Output

All Dialex CLI commands accept `--json` for integration into automated pipelines and AI agents:

```bash
dialex check --json
dialex generate --json
dialex export --json
dialex import translations.json --json
dialex translate --dry-run --json
```

Output is emitted to stdout as structured JSON, while logs and warnings are suppressed. On error, the process exits with a non-zero code.
