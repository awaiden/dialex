# @dialexjs/language-server

## 0.7.2

### Patch Changes

- 0800399: Editor features follow a dictionary held in a variable: after `const s = useDictionary("showcase")`, hover, go to definition and completion work on `s.nav.features` and `s.`, in the language server and the VS Code extension.
- @dialexjs/cli@0.7.2

## 0.7.1

### Patch Changes

- 8ee86f2: New package `@dialexjs/language-server`: a language server (LSP) for Dialex translations, so editors other than VS Code get diagnostics, hover, go to definition, completion, quick fixes and automatic `dialex.generated.ts` updates. The editor-independent features (hover, definition, completion, quick fixes, project discovery) moved into it and are shared with the VS Code extension.
- Updated dependencies [b883a78]
  - @dialexjs/cli@0.7.1
