---
"dialexjs": patch
"@dialexjs/cli": patch
---

The VS Code extension re-reads only the files that changed. `analyzeProject` takes an optional `cache` (`createAnalysisCache()`) that remembers parsed dictionaries and scanned source files by modification time, and the extension keeps the project layout and `.gitignore` rules until files are added or removed. On a synthetic project with 10,000 source files a refresh went from about 950 ms to about 240 ms.
