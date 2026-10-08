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

| 选项            | 类型                          | 默认值              | 说明                                                                            |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | 无法解析出 locale 时使用的 locale                                               |
| `locales`       | `string[]`                    | —                   | 受支持的 locale；启用 locale 类型收窄和一致性检查                               |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | 词典文件的 glob                                                                 |
| `configFile`    | `string`                      | —                   | 自定义配置路径                                                                  |
| `fallbacks`     | `Record<string, string[]>`    | —                   | 每个 locale 显式的[回退链](./fallbacks.md)                                      |
| `prefixDefault` | `boolean`                     | `true`              | 默认 locale 是否也带 URL 前缀。由 `I18nLink` 和[路由辅助函数](./routing.md)读取 |
| `lazy`          | `boolean`                     | `false`             | 按需加载词典（仅 Vite）。参见[懒加载](./lazy-loading.md)                        |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) 使用的提供者                          |

通过 `i18nPlugin()` 或 `withI18n()` 传入的内联选项会覆盖文件中的设置。
