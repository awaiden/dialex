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

| 选项            | 类型                          | 默认值              | 说明                                                                                                                   |
| --------------- | ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | 无法解析出 locale 时使用的 locale                                                                                      |
| `locales`       | `string[]`                    | —                   | 支持的 locale；启用 locale 类型收窄和一致性检查。省略时，`dx generate` 会使用你的词典所定义的 locale                   |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | 词典文件的 glob                                                                                                        |
| `exclude`       | `string[]`                    | —                   | 相对于项目的 glob，永远不会被扫描以查找词典或源文件                                                                    |
| `output`        | `string`                      | —                   | `dialex generate` 写入 `dialex.generated.ts` 的位置，相对于项目；类型声明写在它旁边。默认是 `src/`，没有则为项目根目录 |
| `configFile`    | `string`                      | —                   | 自定义配置路径                                                                                                         |
| `fallbacks`     | `Record<string, string[]>`    | —                   | 每个 locale 显式的[回退链](./fallbacks.md)                                                                             |
| `prefixDefault` | `boolean`                     | `true`              | 默认 locale 是否也带 URL 前缀。由 `DialexLink` 和[路由辅助函数](./routing.md)读取                                      |
| `lazy`          | `boolean \| "locale"`         | `false`             | 按需加载词典（客户端包）：`true` 按词典拆分，`"locale"` 按词典和 locale 拆分。参见[懒加载](./lazy-loading.md)          |
| `lint`          | `{ rules }`                   | —                   | 关闭检查或更改其级别和选项，适用于 `dialex check`、编辑器以及 [ESLint 和 oxlint 规则](./linting.md)                    |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) 使用的提供者                                                                 |

Dialex 会跳过 `node_modules`、构建输出以及 `.gitignore` 文件忽略的所有内容（对于 monorepo 中的包，也包括仓库根目录的 `.gitignore`）。其他情况请使用 `exclude`，例如你提交的 vendor 目录。

该文件是可选的：没有它时，上面的所有默认值都会生效。`dx generate` 会把运行时需要的设置（不含 `translate`）复制到 `dialex.generated.ts`，因此修改文件后请重新运行。

## 在哪里找到该文件

工具会在项目根目录（你运行 `dialex` 的文件夹，或编辑器中项目所在的文件夹）中先查找 `dialex.config.<ext>`，再查找 `i18n.config.<ext>`，其中 `<ext>` 为 `ts`、`mts`、`cts`、`js`、`mjs`、`cjs` 或 `json` 之一。先找到的生效。`-c, --config <path>`（或编辑器设置 `dialex.configPath`）可指向另一个文件。在 monorepo 中，每个带有配置的包都是各自的项目，只有词典的包使用默认值。

## 工具如何读取它

| 工具                                                        | 读取配置的方式                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `dialex generate`、`check`、`export`、`import`、`translate` | 运行该文件，因此值可以是计算出来的（`locales: getLocales()`） |
| 编辑器扩展和语言服务器                                      | 读取其语法树，从不运行它                                      |

由字面量（字符串、数组、布尔值）组成的配置在任何地方都能被理解。计算出来的设置对编辑器不可见，编辑器会对它使用默认值并记录一条说明。如果编辑器必须知道 `locales`，请把它们直接写出来。

## 示例

带有地区回退、且默认 locale 不带前缀的项目：

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "pt", "pt-BR", "es"],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
});
```

源码文件夹不是 `src/`、并排除了第三方文件夹的框架：

```ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
  exclude: ["vendor/**"],
});
```
