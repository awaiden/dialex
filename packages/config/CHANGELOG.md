# @dialexjs/config

## 0.9.0

### Minor Changes

- 3de2c53: Add `@dialexjs/config`. It reads `dialex.config.*` (running it only when its syntax tree is not enough) and writes `.dialex/config.json` before every `dialex generate` and `dialex check`. The native `dx` and language server read that file instead of parsing the config themselves, so a config with spreads, imports or computed values no longer hands the whole command to the Node CLI, and there is one reader of the config instead of two.

  The language server resolves the config with the package of its own install and never runs a script it finds inside the workspace. Add `.dialex/` to your `.gitignore`.

### Patch Changes

- Updated dependencies [4b70e2e]
  - dialexjs@0.9.0
