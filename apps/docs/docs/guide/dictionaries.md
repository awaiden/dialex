# Dictionaries

A dictionary is a named object mapping each locale to its content. Files are discovered by the `include` glob (default `**/*.content.ts`).

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Hello" },
  tr: { title: "Merhaba" },
});
```

`defineDictionary` has two call forms:

```ts
defineDictionary("home", { en: {...}, tr: {...} });
defineDictionary({ name: "home", dictionary: { en: {...}, tr: {...} } });
```

Both return `{ name, dictionary }` and register the dictionary in the in-process `globalDictionaries` map.

## Values

Values can be strings, nested objects, or functions. Functions give you typed interpolation:

```ts
en: {
  greeting: (name: string) => `Hello, ${name}!`,
  items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
}
```

## Locale parity

Every dictionary should define the same keys for every locale. Run [`dialex check`](../cli/check.md) in CI to enforce it; it also reports a configured locale that a dictionary lacks.

## Rules

- **The name is a literal and unique.** `defineDictionary("home", ...)`: a string literal, not a variable or an expression. It is the first segment of every [key path](./key-paths.md) and the argument of `getDictionary`. Two dictionaries with the same name collide: only one is reachable.
- **One default export per file.** `dialex generate` finds dictionaries by the `include` glob and reads the default export of each file.
- **Every locale has the same keys.** [`dialex check`](../cli/check.md) reports the ones that do not.
- **Keys cannot contain dots.** A dot is the separator of a key path, so `"nav.about"` is a nested `nav` object with an `about` key, not one key.

<a id="what-the-tools-can-read"></a>

## What the tools can read

`dialex generate`, `dialex check`, the editor extension and the language server read your dictionaries from their **syntax tree**, without running them. That is what makes them fast and safe to run in an editor. It also means they can only understand what is written as plain values:

| In the dictionary file                                             | Read statically? |
| ------------------------------------------------------------------ | ---------------- |
| `defineDictionary("home", { en: { ... }, tr: { ... } })`           | Yes              |
| `defineDictionary({ name: "home", dictionary: { ... } })`          | Yes              |
| Nested objects, string literals, functions and methods             | Yes              |
| `...shared` (a spread) anywhere in the locales or their content    | No               |
| Computed keys: `[key]: "..."`                                      | No               |
| A locale whose content is a variable or an import: `en: enStrings` | No               |
| A name that is not a string literal                                | No               |

A dictionary that cannot be read statically is not wrong; the tools just have to run it. `dialex check` does (it imports the file), the native binary hands the command to the Node CLI, and the editor reports the file as "not analyzable" and skips it, so it has no diagnostics, hover or completion for its keys. If you want editor support everywhere, keep dictionaries as literal objects, and share text with a function or a helper that is called inside a leaf instead of spreading objects.
