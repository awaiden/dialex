# 类型安全

`dialex generate` 会在 `src/dialex.generated.ts` 旁边写出 `src/dialex-env.d.ts`。它扩充四个接口：

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

结果：

- `Locales` 会收窄为你配置的 locale（需要在配置中设置 `locales`，否则仍为 `string`）。
- `getDictionary("home")`、`useDictionary("home")` 和 `req.getDictionary("home")` 会自动补全词典名称，并返回精确的内容类型，包括 `greeting(name: string)` 这样的函数签名。
- 未知的名称仍然可以编译（键类型为 `keyof DictionaryRegistry | (string & {})`），并返回 `any`。
- `t("cart.items", { count: 3 })` 会按消息的 ICU 参数（`MessageArguments`）进行检查：缺少、拼错或类型错误的参数都是编译错误。参见 [ICU 消息](./icu.md#types)。

请确保 `tsconfig.json` 包含 `src/dialex-env.d.ts`。
