# Configuration

Dialex loads `dialex.config.*` (or `i18n.config.*`) from the project root; `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, and `.json` are supported.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Option          | Type                          | Default             | Description                                                                                                                                                                    |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defaultLocale` | `string`                      | `"en"`              | Locale used when none can be resolved                                                                                                                                          |
| `locales`       | `string[]`                    | —                   | Supported locales; enables locale type narrowing and parity checks. When omitted, `dx generate` uses the locales your dictionaries define                                      |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) for dictionary files                                                                                                                                                   |
| `exclude`       | `string[]`                    | —                   | Globs, relative to the project, that are never scanned for dictionaries or sources                                                                                             |
| `output`        | `string`                      | —                   | Where `dialex generate` writes `dialex.generated.ts`, relative to the project; the type declarations go next to it. Defaults to `src/`, or the project root when there is none |
| `configFile`    | `string`                      | —                   | Custom config path                                                                                                                                                             |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Explicit [fallback chains](./fallbacks.md) per locale                                                                                                                          |
| `prefixDefault` | `boolean`                     | `true`              | Whether the default locale also gets a URL prefix. Read by `DialexLink` and the [routing helpers](./routing.md)                                                                |
| `lazy`          | `boolean \| "locale"`         | `false`             | Load dictionaries on demand (client bundles): `true` splits per dictionary, `"locale"` per dictionary and locale. See [Lazy Loading](./lazy-loading.md)                        |
| `lint`          | `{ rules }`                   | —                   | Turn checks off or change their level and options, for `dialex check`, the editors and the [ESLint and oxlint rules](./linting.md)                                             |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Provider for [`dialex translate`](../cli/translate.md)                                                                                                                         |

Dialex skips `node_modules`, build output and everything your `.gitignore` files ignore (including the repository's, for a package inside a monorepo). Use `exclude` for anything else, such as a vendored folder you do commit.

The file is optional: without it every default above applies. `dx generate` copies the settings the runtime needs (not `translate`) into `dialex.generated.ts`, so rerun it after changing the file.

## Where the file is found

The tools look in the project root (the folder you run `dialex` from, or the folder of the project in the editor) for `dialex.config.<ext>` and then `i18n.config.<ext>`, with `<ext>` one of `ts`, `mts`, `cts`, `js`, `mjs`, `cjs` or `json`. The first one found wins. `-c, --config <path>` (or the `dialex.configPath` editor setting) points at a different file. In a monorepo, each package that has a config is its own project, and a package with only dictionaries uses the defaults.

## How the tools read it

| Tool                                                        | Reads the config by                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `dialex generate`, `check`, `export`, `import`, `translate` | Running the file, so values can be computed (`locales: getLocales()`)               |
| The native `dx`                                             | Reading `.dialex/config.json`, which `@dialexjs/config` writes before every command |
| The editor extension and language server                    | Reading its syntax tree, and never running it                                       |

A config made of literals (strings, arrays, booleans) is understood everywhere. A setting that is computed is invisible to the editor, which then uses the default for it and logs a note. If an editor must know `locales`, write them out. See [Native binaries](./native.md).

`.dialex/config.json` is generated, like `dialex.generated.ts`: add `.dialex/` to your `.gitignore`. It is written again before every `dialex generate` and `dialex check`, so it is never out of date. A config made only of literals is read from its syntax tree and is not run. One with spreads, imports or computed values is run by `@dialexjs/config`, which is the only step that needs Node.

## Examples

A project with regional fallbacks and the default locale served without a prefix:

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "pt", "pt-BR", "es"],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
});
```

A framework whose source folder is not `src/`, with a vendored folder excluded:

```ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
  exclude: ["vendor/**"],
});
```
