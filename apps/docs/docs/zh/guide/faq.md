# 常见问题

简短的回答，并附有包含详细说明的页面链接。

## 设计

### 为什么词典是 TypeScript 文件而不是 JSON？

为了让编译器能够检查它们。词典是代码：它的键有类型，值可以是带类型参数的函数，编辑器还能从 `t("home.title")` 跳转到定义。JSON 在边缘处仍然可用：[`dialex export`](../cli/export.md) 为翻译人员写出 JSON、CSV 或 XLIFF，[`dialex import`](../cli/import.md) 把他们的成果写回 TypeScript 文件。

### 我能在运行时从 API 或数据库加载翻译吗？

Dialex 是为随应用一起发布的翻译而设计的。词典是任意对象，所以你可以自己填充一个，并把它作为 `dictionaries` 传给适配器或 Provider，但这样它就没有类型、检查，也不会为你生成。对于无需发布就会变化的内容，请使用你的 CMS，而把界面字符串留在 Dialex 中。

### 运行时有多大？

带有 ICU 解析器和格式化器的 `t()` 函数压缩后约 8 KB（gzip 约 3 KB）；单独的 `dialexjs/icu` 约 7 KB。在此之上，框架适配器都很小。实测数据以及与其他库的比较见[基准测试](./benchmarks.md)。

### 它支持服务端渲染吗？

支持。服务端适配器按请求解析 locale，UI Provider 接受 `initialLocale`，使客户端首次渲染与服务端一致。已记住的 locale 会有意在挂载之后才应用，保证水合永远不会不匹配。参见你的[框架页面](../frameworks/README.md)。

## Locale

### 如何添加一种语言？

1. 把它加入 `dialex.config.ts` 的 `locales`。
2. 运行 `dialex check --fix`：每个词典都会得到缺失的键，值从默认 locale 复制，并标记为 `[TODO]`。
3. 翻译它们：手工翻译、用 [`dialex translate`](../cli/translate.md) 加 provider，或通过 [`export`/`import`](../cli/export.md)。
4. 运行 `dialex generate` 和 `dialex check`。

### Dialex 会根据浏览器选择语言吗？

在服务端会：适配器按这个[顺序](./locale-detection.md)读取 `Accept-Language`、URL、查询字符串和 Cookie。在浏览器中，Provider 不会读取 `navigator.language`：它们使用服务端解析出的 locale 和用户的选择（保存在 Cookie 或 `localStorage` 中）。React Native 通过 `deviceLocales` 获取设备语言。

### 缺少翻译时会怎样？

查找沿[回退链](./fallbacks.md)进行：locale 本身、显式的 `fallbacks`、去掉地区的语言（`pt-BR` 到 `pt`），然后是默认 locale。如果都没有该键，`t()` 会发出警告并返回路径本身。`dialex check` 会报告缺失的键，避免它们进入生产环境。

### 它支持从右到左的语言吗？

Dialex 翻译文本并格式化数字和日期；它不设置文本方向。Provider 会让 `<html lang>` 与 locale 保持同步。请自己根据 locale 推导 `dir`，例如 `dir={["ar", "he", "fa"].includes(locale) ? "rtl" : "ltr"}`。

### 在有很多形式的语言中，复数如何工作？

消息使用 ICU 的 `plural` 和 `selectordinal`，通过 `Intl.PluralRules` 应用该 locale 的 CLDR 规则。俄语需要 `one`、`few`、`many` 和 `other`；阿拉伯语有六个类别。当消息缺少其语言所需的类别时，`dialex check` 会发出警告。参见 [ICU 消息](./icu.md)。

## 工作流

### 我需要一直运行 `dialex generate` 吗？

开发时运行 `dialex generate --watch`，或使用在保存时重新生成的 [VS Code 扩展](./vscode.md)。在 CI 中运行 `dialex check`：生成的文件过期时它会失败。

### 生成的文件应该提交吗？

两种做法都行。提交它们意味着全新克隆无需构建步骤就能通过类型检查；忽略它们意味着每次安装都必须运行 `dialex generate`。`dialex check` 会把生成的文件与 `generate` 将写出的内容比较，所以如果你提交了它们，CI 会保证它们是准确的。

### 翻译人员怎样配合它工作？

把 [`dialex export`](../cli/export.md) 的输出（JSON、CSV 或 XLIFF）交给他们；他们永远看不到 TypeScript。用 [`dialex import`](../cli/import.md) 取回他们的成果，它会校验 ICU 消息并拒绝未知的键。或者让 provider 用 [`dialex translate`](../cli/translate.md) 翻译，并用 `dialex lock` 发现源文本之后的变化。

### `dialex translate` 会把我的代码发送到什么地方吗？

不会。除非你配置了 provider，否则什么都不会发送；配置之后，也只有待翻译的字符串（不是你的代码）会分批发送给该 provider。`dialex translate --dry-run` 会列出将要发送的内容。

### 可以在 monorepo 中使用吗？

可以。每个带有 `dialex.config.*`（或只有 `*.content.ts` 文件）的包就是一个项目。CLI 从你运行它的文件夹开始工作，编辑器工具会找到工作区中的每个项目并把嵌套项目区分开。仓库的 `.gitignore` 文件会被遵守。

## 工具

### CLI 是用 Rust 写的吗？

`dialex generate` 和 `dialex check` 有原生实现，输出与 Node CLI 相同，在大型项目中快 20 到 40 倍；其余命令都在 Node 中运行。参见[原生二进制](./native.md)。

### 为什么编辑器跳过了我的某个词典？

它无法在不运行代码的前提下读取该词典：它使用了展开、计算键、导入值或计算名称。请使用字面量对象，或者接受对该文件而言 `dialex check`（它会求值该文件）才是检查手段。参见[词典](./dictionaries.md#what-the-tools-can-read)。

### “1.0 之前”对我意味着什么？

API 可能在次版本之间发生变化。不兼容的更改随次版本发布，并列在[更新日志](./changelog.md)中，补丁版本保持兼容。请固定你所使用的次版本。
