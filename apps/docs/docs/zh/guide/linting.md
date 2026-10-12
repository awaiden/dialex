# 使用 ESLint 和 oxlint 进行 Lint

`@dialexjs/eslint-plugin` 在你其他 lint 错误已经出现的地方报告 Dialex 的问题：终端、CI，以及任何运行 ESLint 或 oxlint 的编辑器。它是同时适用于两种 linter 的同一个包，因为 oxlint 能加载 ESLint 风格的插件。

被检查文件的上层目录中需要有 `dialex.config.*`，没有它的项目中插件什么也不做。与 `dialex check` 一样，它从语法树读取字典和配置，从不运行项目代码。

## ESLint

安装后，把它的配置添加到 `eslint.config.js`：

```sh
npm install --save-dev @dialexjs/eslint-plugin
```

```js
import dialex from "@dialexjs/eslint-plugin";

export default [dialex.configs.recommended];
```

## oxlint

oxlint 没有可共享的配置，因此请自行在 `.oxlintrc.json` 中列出插件和规则：

```json
{
  "jsPlugins": ["@dialexjs/eslint-plugin"],
  "rules": {
    "dialex/no-unknown-dictionary": "error",
    "dialex/no-unknown-path": "error",
    "dialex/no-dynamic-key": "warn",
    "dialex/valid-dictionary": "error"
  }
}
```

oxlint 的 JS 插件仍处于 alpha 阶段，并且不会在 `.vue`、`.svelte` 或 `.astro` 文件上运行插件规则。这些文件仍由 `dialex check` 和编辑器扩展覆盖。

## 规则

| 规则                           | 报告内容                                                                                | `recommended` |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------- |
| `dialex/no-unknown-dictionary` | `getDictionary("x")`、`useDictionary("x")` 或 `@DialexDictionary("x")` 指向不存在的字典 | `error`       |
| `dialex/no-unknown-path`       | `t("a.nope")` 中 `a` 是已知字典，但没有这个键                                           | `error`       |
| `dialex/no-dynamic-key`        | 不是字符串字面量的字典名或键，Dialex 无法检查                                           | `warn`        |
| `dialex/valid-dictionary`      | `dialex check` 在字典文件中发现的所有问题                                               | `error`       |
| `dialex/no-literal-string`     | 直接写在 JSX 中、而不是来自字典的文本                                                   | 关闭          |

### no-unknown-dictionary

与 `unknown-dictionary` 诊断相同的检查。在代码中用 `dictionaries: { name: ... }` 注册的字典视为已知，注释从不会被检查。

### no-unknown-path

与 `unknown-path` 相同的检查。Dialex 不认识的字典的键会被忽略，因为 `t()` 可能属于其他库。

### no-dynamic-key

`getDictionary(name)` 和 ``t(`home.${key}`)`` 无法验证。单独的 `t` 只在从 `dialexjs` 导入的文件中检查，因为其他库也使用这个名字。

### valid-dictionary

在字典文件上运行，针对编辑器中的文本，报告 `missing-key`、`missing-locale`、`invalid-icu` 和 `todo-placeholder` 等字典[代码](./diagnostics.md)。未使用的键和字典留给能看到整个项目的 `dialex check`。用 `ignore` 跳过某些代码：

```json
{ "dialex/valid-dictionary": ["error", { "ignore": ["todo-placeholder"] }] }
```

### no-literal-string

标记包含字母的 JSX 文本，以及 `title`、`alt`、`placeholder`、`aria-label` 和 `label` 的值。它在 `recommended` 中是关闭的，因为多数项目都有可以保留的文本。选项：

```json
{
  "dialex/no-literal-string": [
    "warn",
    { "attributes": ["title", "alt"], "ignore": ["^OK$"], "ignoreComponents": ["Trans", "code"] }
  ]
}
```

`attributes` 替换属性列表，`ignore` 是与去除首尾空白后的文本匹配的正则表达式列表，`ignoreComponents` 指定内容会被跳过的元素（默认为 `Trans`、`code`、`pre`、`script` 和 `style`）。

## 配置

规则只需在 `dialex.config.ts` 的 `lint.rules` 下配置一次。`dialex check`、编辑器扩展以及这些 ESLint 和 oxlint 规则都会读取它，因此一项检查在所有地方都以相同的选项开启或关闭。

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lint: {
    rules: {
      "unused-key": "off",
      "missing-key": "warn",
      "literal-string": ["warn", { ignore: ["^OK$"] }],
    },
  },
});
```

键是[诊断代码](./diagnostics.md)，外加只由 linter 插件评估的 `dynamic-key` 和 `literal-string`。值可以是 `"off"`、`"warn"`、`"error"` 或 `[level, options]`。级别会改变 `dialex check` 和编辑器报告问题的方式。在 ESLint 中，它就是 `dialex.configs.recommended` 赋予规则的严重程度，从 ESLint 运行目录下的 `dialex.config.*` 读取；`literal-string` 只有在这里设置后才会在 `recommended` 中开启。

oxlint 从无法动态计算的 `.oxlintrc.json` 读取严重程度，请在那里按你想要的级别列出规则。`dialex.config.ts` 中的 `"off"` 和选项仍然生效，因此在那里关闭的检查保持安静。`valid-dictionary` 是对应多个代码的一条规则，linter 以同一级别显示它；按代码区分的级别在 `dialex check` 和编辑器中生效。在 linter 自己的配置里传给规则的选项会覆盖 `dialex.config.ts` 中的选项。

## 抑制报告

使用 linter 自己的注释，例如 `// eslint-disable-next-line dialex/no-unknown-dictionary`。[诊断](./diagnostics.md)中的 `dialex-ignore` 注释用于 `dialex check` 和编辑器，插件不会读取它们。

## 编辑器

如果你的编辑器已经通过 ESLint 或 oxlint 显示这些问题，请关闭 Dialex 自己的那一份，让每个问题只显示一次。悬停、补全和快速修复仍然可用。在 VS Code 中：

```json
{ "dialex.diagnostics": false }
```

在 Zed 中，把 `lsp.dialex.settings` 下的 `diagnostics` 设为 `false`（[Zed 和其他编辑器](./zed.md)）。
