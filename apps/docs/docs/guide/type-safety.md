# Type Safety

`dialex generate` writes `src/dialex-env.d.ts` next to `src/dialex.generated.ts`. It augments four interfaces:

```ts
declare module "dialexjs" {
  export interface Register {
    locales: "en" | "tr";
  }
  export interface MessageArguments {
    "cart.items": { count: number };
  }
}

declare module "dialexjs/react" {
  export interface DictionaryRegistry extends Record<"home" /* ... */> {}
}

declare module "dialexjs/server" {
  export interface DictionaryRegistry extends Record<"home" /* ... */> {}
}
```

The result:

- `Locales` narrows to your configured locales (needs `locales` in the config; otherwise it stays `string`).
- `getDictionary("home")`, `useDictionary("home")`, and `req.getDictionary("home")` autocomplete dictionary names and return the exact content type, including function signatures like `greeting(name: string)`.
- Unknown names still compile (the key type is `keyof DictionaryRegistry | (string & {})`) and return `any`.
- `t("cart.items", { count: 3 })` is checked against the message's ICU arguments (`MessageArguments`): a missing or misspelled argument, or one of the wrong type, is a compile error. See [ICU Messages](./icu.md#types).

Make sure `src/dialex-env.d.ts` is included by your `tsconfig.json`.
