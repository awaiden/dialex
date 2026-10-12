# 故障排查

找到症状，读懂原因，应用修复。只与某个框架相关的问题在该框架的页面上；其余的在这里。想知道某条 `check` 消息的含义，请看[诊断参考](./diagnostics.md)。

## 类型与生成的文件

### `t("home.title")` 或 `getDictionary("home")` 没有自动补全或类型

类型来自 `dialex generate` 写出的 `dialex-env.d.ts`。按顺序检查：

1. 文件存在：运行 `dialex generate`。
2. TypeScript 包含了它。把它（或它所在的文件夹）加入 `tsconfig.json` 的 `include`，并重启编辑器中的 TypeScript 服务器。
3. `moduleResolution` 是 `"bundler"`、`"node16"` 或 `"nodenext"`（见[环境要求](./requirements.md)）。
4. 生成的文件是最新的：运行 `dialex generate --watch`，或使用在保存时重新生成的编辑器扩展。

### 我修改了词典，类型没有更新

没有任何东西会替你重建生成的文件。运行 `dialex generate`，保持 `dialex generate --watch` 运行，或使用 [VS Code 扩展](./vscode.md)。`dialex check` 会把过期的文件报告为错误，因此 CI 能发现它。

### `Cannot find module 'dialexjs/react'`（或其他子路径）

`moduleResolution` 是 `"node"`（也叫 `node10`），它不会读取包的 `exports` 映射。把它设为 `"bundler"` 或 `"nodenext"`。

### `dialex check` 说生成的文件已过期，但我刚刚生成过

可能是格式化工具（Prettier、Biome、oxfmt）重写了它。`check` 会忽略空白、引号和尾随逗号，因此单靠格式化不会导致这个问题：请查找不同的 `locales` 或 `include`、上次运行之后修改过的词典，或者用 `-o` 运行了 `dialex generate` 而 `check` 在看默认路径。把生成的文件加入格式化工具的忽略列表，可以避免嘈杂的 diff。

## Locale 与词典

### `[dialex] Dictionary "x" not found`

词典不在 `dialex.generated.ts` 中。请检查它的文件匹配 `include`（默认 `**/*.content.ts`）、没有被 `.gitignore` 或 `exclude` 排除、使用了 `export default defineDictionary("x", ...)`，并且名称完全一致。然后运行 `dialex generate`。

### `[dialex] Locale "tr" not found in dictionary "x", using "en"`

词典没有 `tr` 内容，因此使用了[回退链](./fallbacks.md)。添加该 locale，或运行 `dialex check --fix` 来创建缺失的键。

### 应用总是渲染默认 locale

没有任何来源给出受支持的 locale。检测顺序是自定义提取函数、URL 第一段、`?locale=` / `?lang=`、`locale` / `lang` Cookie，然后是 `Accept-Language`。请检查：已设置 `locales`（缺省时会忽略 `/tr` 这样的路径前缀）、客户端确实发送了 Cookie 或请求头，以及适配器在路由之前注册。参见 [Locale 检测](./locale-detection.md)。

### locale 在客户端变了，但服务端渲染的是另一个

服务端和客户端分别解析 locale。把服务端渲染所用的 locale 作为 `initialLocale` 传给 Provider，使客户端首次渲染与之匹配。已记住的 locale 会有意在挂载之后才应用，以保证水合一致。

### `useDialex must be used within a DialexProvider`

组件在 Provider 之外渲染。把 `<DialexProvider {...dialex}>` 放在根部、任何使用 Hook 的组件之上，并且从与 Provider 相同的入口点导入 Hook。

### 首次渲染时词典为空

你使用了 `lazy` 加载，因此词典在加载完成前是空的（在 React 中则会挂起）。指明你读取的词典（`useT("home")`），在 React 中用 `<Suspense>` 包裹，或在渲染之前调用 [`preloadDictionaries`](../api/client-frameworks.md#preloaddictionaries)。参见[懒加载](./lazy-loading.md)。

## 消息

### `t("cart.items", { count })` 返回了原始消息

要么字符串无法解析（控制台会显示 `[dialex] Could not format ...`），要么没有传入值对象：不带值的字符串会原样返回。运行 `dialex check` 查看确切的 ICU 错误。

### 字面花括号或撇号显示不对

在 ICU 中，`{` 和 `}` 用来开始和结束参数，`'` 用来给它们加引号。把字面花括号写成 `'{'`，把撇号写成 `''`。字母前单独的 `'` 会原样保留。参见 [ICU 消息](./icu.md)。

### 某个复数在另一种语言中显示了错误的形式

该语言需要你的消息没有提供的类别（俄语需要 `few` 和 `many`，阿拉伯语需要六种）。`dialex check` 会以 `icu-plural-categories` 发出警告。补上这些选项；`other` 是回退。

## CLI 与原生二进制

### `dx` 很慢，或者我想知道原生二进制是否在运行

运行 `DIALEX_NATIVE=1 dx check`：如果它以 `native check declined` 失败，原因就在消息里。参见[原生二进制](./native.md)。

### `dialex: this command needs the Node CLI (@dialexjs/cli), which was not found`

原生二进制是单独启动的，旁边没有 Node CLI。在项目中安装 `@dialexjs/cli`，把 `DIALEX_NODE_CLI` 设为它的 `dist/index.mjs`，或使用 `DIALEX_NATIVE=0`。

### 我安装了这个包，但 `dx` 仍在 Node 中运行

平台包没有安装（`--no-optional`、不受支持的平台或 Alpine/musl），或者该平台不受支持。`npm ls @dialexjs/cli-linux-x64`（换成你的平台）会显示它是否存在。结果相同，只是更慢。

### `dialex check` 对某个词典什么也不报告

该词典使用了展开、计算键或导入值，无法从语法树读取。`dialex check` 会求值这样的文件；编辑器会跳过它。参见[词典](./dictionaries.md#what-the-tools-can-read)。

### `dialex translate` 说没有配置 provider

在 `dialex.config.ts` 中设置 `translate.provider`。参见 [`dialex translate`](../cli/translate.md)。

## 编辑器

### 编辑器没有显示诊断、悬停或补全

- 工作区里没有 Dialex 项目：需要一个 `dialex.config.*`，或在 `package.json` 旁边有一个 `*.content.ts` 文件。
- 扩展或服务器被禁用：检查 `dialex.enable` 设置。
- 词典使用了展开或计算键：它会被报告为无法分析并被跳过。
- 文件被 `.gitignore` 或 `exclude` 忽略。
- 语言服务器没有启动：在 Zed 中它需要 Node.js；原因见服务器日志。

### 从来看不到未使用的键

它们默认是关闭的。打开 `unusedKeys` 设置；之后它们会显示为淡化文本。

## 仍然卡住了

运行 `dialex check --json` 和 `dialex --version`，并在 [GitHub](https://github.com/awaiden/dialex/issues) 上提交 issue，附上输出、你的 `dialex.config.*` 以及能复现问题的最小词典。
