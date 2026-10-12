# CLI API

`@dialexjs/cli/api` is the programmatic API the [VS Code extension](../guide/vscode.md) and the language server are built on. It reads dictionaries and configs from the syntax tree and **does not run project code**, except for the two opt-in functions marked below.

```ts
import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
```

## Analysis

### `analyzeProject(options)`

```ts
function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult>;
```

Finds the dictionaries of a project, checks locale parity, ICU messages, lock-file staleness and references from source code, and returns the issues. `dialex check` is a thin layer over it.

| Option     | Type                  | Default               | Description                                                                                                                     |
| ---------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `root`     | `string`              | —                     | The project folder. Required                                                                                                    |
| `config`   | `AnalysisConfig`      | —                     | `defaultLocale`, `locales`, `include`, `exclude`. Required                                                                      |
| `src`      | `string[]`            | `DEFAULT_SOURCE_GLOB` | Source globs to scan for references. Pass `[]` to skip scanning                                                                 |
| `runtime`  | `boolean`             | `false`               | **Runs project code.** Imports dictionaries the syntax tree cannot describe (spreads, computed keys). Editors must leave it off |
| `ignore`   | `string[]`            | —                     | More ignore globs, relative to `root` (nested projects)                                                                         |
| `unused`   | `boolean`             | `true`                | Report possibly unused keys and dictionaries                                                                                    |
| `lock`     | `boolean`             | `true`                | Report translations whose source text changed since `dialex.lock.json`                                                          |
| `cache`    | `AnalysisCache`       | —                     | Reuse parsed dictionaries and scanned sources between calls. Ignored with `runtime`                                             |
| `contents` | `Map<string, string>` | —                     | Unsaved text of files by absolute path, read instead of the file on disk. For linters and editors                               |

The result:

| Field                | Type                   | Description                                                                           |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `issues`             | `AnalysisIssue[]`      | Everything found. See the table below                                                 |
| `dictionaries`       | `AnalyzedDictionary[]` | One entry per readable dictionary                                                     |
| `files`              | `string[]`             | Absolute paths of every dictionary file that matched                                  |
| `sourceFilesScanned` | `number`               | How many source files were scanned for references                                     |
| `inlineDictionaries` | `string[]`             | Names registered in code with `dictionaries: { name: ... }`. Empty when `src` is `[]` |

An `AnalysisIssue` has `file`, `level` (`"error" \| "warning" \| "info"`), `code` ([see the codes](../guide/diagnostics.md)), `message`, and, when known, `range` (zero-based `{ start, end }` of `{ line, column }`), `dictionary`, `locale`, `path`, and `sourceLocale` (for `missing-key`: a locale to copy the key from).

An `AnalyzedDictionary` has `name`, `file`, `locales`, `leaves` (`locale -> dotted path -> { kind, value? }`), `paths` (the union of dotted paths) and, when read statically, `df` for editing.

### Other analysis exports

| Export                        | Description                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createAnalysisCache()`       | An `AnalysisCache` for a long-lived caller. It reuses what has not changed (keyed by modification time and size)                                                   |
| `analyzeProjectSync(options)` | `analyzeProject` for callers that cannot await, such as lint rules. Reads dictionaries from the syntax tree only: `runtime` is ignored, so project code never runs |
| `clearGitignore(cache)`       | Forgets the cached `.gitignore` rules, for example after a `.gitignore` changed                                                                                    |
| `scanReferences(text)`        | Finds `getDictionary("x")`-style and `t("x.y.z")` references in source text. Returns `{ kind, value, start, end }[]`                                               |
| `scanText(text)`              | Like `scanReferences`, and also returns the dictionary names the text registers inline. Returns `{ references, inline }`                                           |
| `relativeFile(root, file)`    | A root-relative path with forward slashes, for display                                                                                                             |
| `DEFAULT_SOURCE_GLOB`         | `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`                                                                                                                |

## Scanning files

| Export                                | Description                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scanFiles(root, patterns, options?)` | Finds files under `root`, skipping build output, configured excludes and Git-ignored paths. Options: `kind`, `exclude`, `ignore`, `gitignore`, `gitignoreFilter` |
| `createGitignoreFilter(root)`         | A function that says whether an absolute path is ignored by Git, reading `.gitignore` files of the project, its parents and nested folders                       |
| `BUILTIN_IGNORE`                      | Folders that never hold dictionaries or sources                                                                                                                  |
| `SOURCE_BUILTIN_IGNORE`               | What the source scan skips on top: other tools' output, declarations, generated and config files                                                                 |

## Editing dictionaries

The helpers work on the syntax tree and keep the rest of the file, comments and formatting included.

| Export                                                     | Description                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `parseDictionaryText(file, text)`                          | Parses dictionary source text (an unsaved buffer, for example). `undefined` when the shape is not editable; throws on a syntax error |
| `loadDictionaryFile(file)`                                 | Loads a file. `undefined` when its shape is not editable                                                                             |
| `renderDictionaryFile(df)`                                 | The source text with all edits applied, without writing                                                                              |
| `saveDictionaryFile(df)`                                   | Writes the edited file                                                                                                               |
| `listLocales(df)`, `listLeaves(df, locale)`                | The locales, and every leaf `{ path, kind, value? }` of a locale in source order                                                     |
| `hasPath(df, locale, path)`, `getString(df, locale, path)` | Whether a key exists, and its string value                                                                                           |
| `setString(df, locale, path, value)`                       | Sets or creates a string. Returns `"created"`, `"updated"` or `"skipped"` (functions are never overwritten)                          |
| `copyLeaf(df, from, to, path, mapString?)`                 | Copies a leaf between locales, optionally rewriting strings. `false` when there is nothing to copy or the target has the key         |
| `locationOf(df, locale, path?)`                            | The range of a locale's or a key's property name                                                                                     |
| `dictionaryLocation(df)`                                   | The range of the object whose keys are locales                                                                                       |
| `getLeafSource(df, locale, path)`                          | The source code of a leaf's value                                                                                                    |
| `TODO_PREFIX`                                              | `"[TODO] "`: what `--fix` puts before copied strings                                                                                 |

## Configuration

| Export                           | Description                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `readStaticConfig(root, file?)`  | Reads `dialex.config.*` from its syntax tree: `{ config, file?, notes }`. `notes` lists settings that are not literals and were left at their defaults |
| `parseStaticConfig(text, file?)` | The same for source text                                                                                                                               |
| `DEFAULT_STATIC_CONFIG`          | The defaults used when a setting cannot be read                                                                                                        |

## Projects and generation

| Export                                                          | Description                                                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `loadStaticProject(root, configFile?)`                          | The config (from the syntax tree) and every dictionary file, ready for reading and editing. Runs no project code |
| `loadProject(root, configFile?)`                                | **Runs project code**: evaluates `dialex.config.*` before loading the dictionaries                               |
| `toKey(dictionary, path)`                                       | `("home", ["nav", "about"])` becomes `"home.nav.about"`                                                          |
| `renderGenerated(root, options?)`                               | Works out `dialex.generated.ts` and `dialex-env.d.ts` without writing, to see whether they are current           |
| `generateDictionaries(root, options?)`                          | Writes the generated files. `options.static` reads the config without running it                                 |
| `startGenerateWatcher(root, options, regenerate, delay?, log?)` | Regenerates when a dictionary or config file is added, edited or removed                                         |

## Lock file

| Export                                    | Description                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `LOCK_FILE`                               | `"dialex.lock.json"`                                                                           |
| `readLock(root)`, `writeLock(root, lock)` | Reads the lock (or `undefined`) and writes it with sorted keys                                 |
| `hashSource(text)`                        | The short fingerprint stored for a source string                                               |
| `isStale(lock, locale, key, text)`        | `true` when the key was recorded from different source text. A key with no record is not stale |

## Types

`AnalysisCache`, `AnalysisConfig`, `AnalysisIssue`, `AnalysisOptions`, `AnalysisResult`, `AnalyzedDictionary`, `IssueCode`, `IssueLevel`, `LeafInfo`, `Reference`, `ScanOptions`, `Lockfile`, `DictionaryFile`, `Leaf`, `LeafKind`, `SourceRange`, `StaticConfig`, `StaticConfigResult`, `Project`, `ProjectDictionary`, `GenerateOptions`, `RenderedGenerate`.
