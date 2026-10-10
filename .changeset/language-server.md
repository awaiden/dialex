---
"dialexjs": patch
"@dialexjs/language-server": patch
---

New package `@dialexjs/language-server`: a language server (LSP) for Dialex translations, so editors other than VS Code get diagnostics, hover, go to definition, completion, quick fixes and automatic `dialex.generated.ts` updates. The editor-independent features (hover, definition, completion, quick fixes, project discovery) moved into it and are shared with the VS Code extension.
