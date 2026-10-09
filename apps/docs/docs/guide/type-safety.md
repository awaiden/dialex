# Type Safety

`dialex generate` writes `src/dialex-env.d.ts` next to `src/dialex.generated.ts`. It augments three interfaces:

```ts
declare module "dialexjs" {
  export interface Register {
    locales: "en" | "tr";
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

Make sure `src/dialex-env.d.ts` is included by your `tsconfig.json`.
