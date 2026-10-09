# 配置

Dialex 会从项目根目录加载 `dialex.config.*`（或 `i18n.config.*`）；支持 `.ts`、`.mts`、`.cts`、`.js`、`.mjs`、`.cjs` 和 `.json`。

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| 选项            | 类型                          | 默认值              | 说明                                                                                                          |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | 无法解析出 locale 时使用的 locale                                                                             |
| `locales`       | `string[]`                    | —                   | 支持的 locale；启用 locale 类型收窄和一致性检查。省略时，`dx generate` 会使用你的词典所定义的 locale          |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | 词典文件的 glob                                                                                               |
| `configFile`    | `string`                      | —                   | 自定义配置路径                                                                                                |
| `fallbacks`     | `Record<string, string[]>`    | —                   | 每个 locale 显式的[回退链](./fallbacks.md)                                                                    |
| `prefixDefault` | `boolean`                     | `true`              | 默认 locale 是否也带 URL 前缀。由 `DialexLink` 和[路由辅助函数](./routing.md)读取                             |
| `lazy`          | `boolean \| "locale"`         | `false`             | 按需加载词典（客户端包）：`true` 按词典拆分，`"locale"` 按词典和 locale 拆分。参见[懒加载](./lazy-loading.md) |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) 使用的提供者                                                        |

该文件是可选的：没有它时，上面的所有默认值都会生效。`dx generate` 会把运行时需要的设置（不含 `translate`）复制到 `dialex.generated.ts`，因此修改文件后请重新运行。
