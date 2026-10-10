---
"dialexjs": minor
"@dialexjs/cli": minor
---

`dialexjs` no longer depends on `fast-glob` and `unconfig` (about 2.9 MB of installed size, mostly `jiti`). The project scanner moved into `@dialexjs/cli`, which already did all the scanning.

**Breaking:** the `dialexjs/scanner` entry point is gone, and adapters no longer scan the project at startup when no `dictionaries` are passed. Pass the generated registry (`{ ...dialex }` from `dialex.generated.ts`); an adapter without it only finds dictionaries already registered through `defineDictionary`.
