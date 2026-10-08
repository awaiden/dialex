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

Every dictionary should define the same keys for every locale. Run [`dialex check`](../cli/check.md) in CI to enforce it. When `locales` is set in the config, the Vite plugin also throws at build time if a dictionary is missing a configured locale.
