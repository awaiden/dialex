---
"dialexjs": patch
---

Fix the VS Code extension: the `.vsix` shipped without the `jiti` and runtime chunks that `extension.cjs` loads, so the extension failed to activate and its commands were "not found". Existing installs need the new `.vsix` from the GitHub Release.
