# How Dialex works

Dialex keeps your translations in TypeScript, turns them into one generated module and a set of type declarations before your app runs, and reads them back with plain object lookups. This page is the map: read it once, and the rest of the docs fall into place.

## The pipeline

```text
  src/home.content.ts            dialex generate              your app at runtime
  ┌────────────────────┐        ┌──────────────────┐        ┌───────────────────────┐
  │ defineDictionary(  │  ───►  │ dialex.generated │  ───►  │ adapter or provider   │
  │   "home", { en,tr })│        │   .ts            │        │ resolves the locale   │
  └────────────────────┘        │ dialex-env.d.ts  │        │ getDictionary / t()   │
        you write                └──────────────────┘        └───────────────────────┘
                                    CLI, build time              runtime, per request
```

1. **You write dictionaries.** One `*.content.ts` file per dictionary, next to the code that uses it, each a `defineDictionary("name", { en: {...}, tr: {...} })` call. See [Dictionaries](./dictionaries.md).
2. **`dialex generate` compiles them.** It reads the files from their syntax tree (it does not run your code), writes `dialex.generated.ts` (the dictionaries and a client-safe copy of your config) and `dialex-env.d.ts` (the types). See [`dialex generate`](../cli/generate.md).
3. **An adapter resolves the locale.** On a server it looks at the URL, query string, cookie and `Accept-Language`; in a UI framework a provider holds the active locale. See [Locale Detection](./locale-detection.md).
4. **Your code reads a dictionary.** `getDictionary("home").title`, `t("home.title")` or a hook. It is an object lookup, plus ICU formatting when you pass values.

Nothing scans the file system at runtime, and nothing is parsed twice: ICU messages are compiled once, on first use.

## What each piece is

| Piece             | What it is                                                                                          | Where it lives                          |
| ----------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Dictionary        | A named object that maps each locale to its content: strings, nested objects, functions             | `*.content.ts`                          |
| Key path          | The address of a value: `home.nav.about` is dictionary `home`, key `nav.about`                      | In `t("home.nav.about")`                |
| Config            | `defaultLocale`, `locales`, `fallbacks`, `lazy`, `translate`...                                     | `dialex.config.ts`                      |
| Generated module  | The dictionaries and settings, as one importable file                                               | `dialex.generated.ts` (do not edit)     |
| Type declarations | Augment `DictionaryRegistry` so names and paths autocomplete and are checked                        | `dialex-env.d.ts` (do not edit)         |
| Adapter           | Framework glue: resolves the locale and gives you `getDictionary` and `t`                           | `dialexjs/<framework>`                  |
| CLI               | `generate`, `check`, `export`, `import`, `translate`, `lock`, `init`                                | `@dialexjs/cli`                         |
| Editor tooling    | Diagnostics, hover, go to definition, completion and quick fixes, from the same analysis as `check` | VS Code extension, language server, Zed |

## What is decided when

| Decided at          | What                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Write time          | Which keys exist, and what type each has                                                                            |
| `dialex generate`   | The generated module and the types. A change to a dictionary or the config is not seen until you run it again       |
| `dialex check` (CI) | Whether every locale has every key, whether ICU messages are valid and consistent, whether code refers to real keys |
| Request or render   | The locale, and so which content is read; ICU values are formatted here                                             |

Because the types come from the generated file, **forgetting to run `dialex generate` is the most common cause of "the types are wrong"**. Run `dialex generate --watch` while you develop, use the editor extension (it regenerates on save), and let `dialex check` fail CI when the file is stale.

## The three ways to say a message

| Form         | Example                                                  | Use it for                                                                             |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Plain string | `title: "Welcome"`                                       | Text without values                                                                    |
| ICU string   | `items: "{count, plural, one {# item} other {# items}}"` | Values, plurals, selects, numbers and dates; works with translators' tools             |
| Function     | `` greeting: (name: string) => `Hello, ${name}!` ``      | Full TypeScript, including `plural()` and the other [formatters](../api/formatting.md) |

All three can sit in the same dictionary. See [ICU Messages](./icu.md) and [Formatting & Plurals](./formatting.md).

## Where to go next

- Start a project: [Getting Started](./getting-started.md), then your [framework](../frameworks/README.md).
- Look something up: the [API reference](../api/README.md) and the [CLI reference](../cli/README.md).
- Something does not work: [Troubleshooting](./troubleshooting.md).
