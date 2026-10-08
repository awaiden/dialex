---
name: dialex-translate
description: Workflow guide for translating Dialex dictionaries using AI or manual workflows. Use when finding missing keys, translating strings, or fixing [TODO] placeholders in Dialex projects.
---

# Translating with Dialex

This skill describes the recommended workflow for updating, translating, and fixing missing dictionary keys.

## Recommended Workflow

### 1. Run Check with JSON Output

Identify any missing keys or unfilled placeholders:

```bash
dialex check --json
```

Or fix missing keys by automatically generating `[TODO]` stubs from default locale:

```bash
dialex check --fix --json
```

### 2. Inspect Missing Keys

If using the Dialex MCP server:

- Call `dialex_missing({ locale: "tr" })` to get the list of keys with missing or `[TODO]` values.

If using CLI / files:

- Look for values prefixed with `[TODO] ` in `*.content.ts` files.

### 3. Translate and Update Values

To safely update a value without altering formatting or other code in the dictionary:

- Via MCP: Call `dialex_set_key({ file: "src/home.content.ts", locale: "tr", path: ["nav", "about"], value: "Hakkımızda" })`.
- Via CLI provider: Run `dialex translate --locale tr` (or `dialex translate --dry-run --json` to preview).
- Via file edit: Replace `"[TODO] About"` with `"Hakkımızda"`.

### 4. Verify Integrity

Run `dialex check` again:

```bash
dialex check --json
```

Ensure all issues are resolved (exit code 0, `totalIssues: 0`).
