# 类型安全

`dialex generate`（以及 Vite 插件和 Next.js 的 `withI18n`）会写入 `src/dialex-env.d.ts`，它扩展了三个接口：

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

结果：

- `Locales` 会收窄为你配置的 locale（需要在配置中设置 `locales`，否则仍为 `string`）。
- `getDictionary("home")`、`useDictionary("home")` 和 `req.getDictionary("home")` 会自动补全词典名称，并返回精确的内容类型，包括 `greeting(name: string)` 这样的函数签名。
- 未知的名称仍然可以编译（键类型为 `keyof DictionaryRegistry | (string & {})`），并返回 `any`。

请确保 `tsconfig.json` 包含 `src/dialex-env.d.ts`。
