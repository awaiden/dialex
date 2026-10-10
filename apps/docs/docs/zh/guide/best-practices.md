# 最佳实践

这些建议适用于所有框架。每一条都源自 Dialex 的工作方式：词典被编译进 `dialex.generated.ts`，locale 在每个请求或每个应用中只解析一次，类型来自你的词典。

## 组织词典

- 每个功能或页面使用一个词典，并放在使用它的代码旁边（结算页旁边放 `checkout.content.ts`）。小文件更容易审查、翻译和懒加载。
- 把整个应用共享的文本放进 `common` 词典，其余内容不要放进去，避免它变成杂物箱。
- 让每个词典包含相同的 locale。`dx check` 会报告缺失的键和 locale，编辑器扩展会在你输入时显示它们。

## 按含义命名键

键描述文本的用途，而不是它现在的内容。措辞变化时，键和所有调用处都保持不变。

```ts
// Good: the key describes the role
defineDictionary("checkout", {
  en: { payButton: "Pay now", emptyCart: "Your cart is empty" },
  tr: { payButton: "Şimdi öde", emptyCart: "Sepetiniz boş" },
});

// Avoid: the key repeats the English text, and breaks when the text changes
defineDictionary("checkout", {
  en: { payNow: "Pay now", yourCartIsEmpty: "Your cart is empty" },
});
```

把相关的键放在一个对象下（`nav.about`、`nav.contact`），嵌套保持在两三层以内。更深的层级在 `t("...")` 调用中很难阅读。

## 写出译者能够完成的消息

- 对复数、选择和数字使用 [ICU 消息](./icu.md)：`{count, plural, one {# item} other {# items}}`。不要把句子拼接起来（`"You have " + n + " items"`），因为语序和复数形式在不同语言中各不相同。
- 给译者的文本优先使用 ICU 字符串而不是函数值。函数适合只有开发者会改动的逻辑，但翻译工具和 `dx check` 能校验 ICU 字符串，却无法查看函数内部。
- 在每个 locale 中保持占位符一致。`dx check` 会报告参数与其他 locale 不同的 locale。

```ts
defineDictionary("cart", {
  en: { items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}" },
  tr: { items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}" },
});

t("cart.items", { count: 3 }); // "3 items"; `count` is checked at compile time
```

## 保持生成文件为最新

- 提交 `dialex.generated.ts` 和 `dialex-env.d.ts`。应用会导入它们，全新检出的代码应当无需生成步骤即可构建。
- 开发时用 `dx generate --watch` 保持更新，或使用 VS Code 或 Zed 扩展，它们会在词典变化时为你重新生成。
- 在 CI 中运行 `dx check --fail-on-stale`。当已提交的生成文件与词典不一致、缺少键或 locale、或翻译已过期时，它会失败。

```yaml
# .github/workflows/ci.yml
- run: bun install --frozen-lockfile
- run: bunx dx check --fail-on-stale
```

## 只在一处解析 locale

- 每个请求（服务端）或每个应用（浏览器）只决定一次 locale，然后向下传递。不要在单个组件中读取 cookie 或 `navigator.language`。
- 使用服务端渲染时，把服务端使用的 locale（`initialLocale`）交给客户端，使客户端首次渲染与 HTML 一致。否则页面会闪现错误的语言，或者水合报告不匹配。
- 把 `<html lang>` 设置为当前 locale。React、Svelte 和 Solid 的 provider 会替你完成；在服务端则需要写入你渲染的 HTML。
- 把访客的选择保存在服务端适配器会读取的 `locale` cookie 中，而不是服务端看不到的 `localStorage`。

## 只加载页面需要的内容

- 小型应用不需要懒加载：把所有词典放在一个 bundle 里最简单也最快。当词典在 bundle 中占比明显时再开启。
- 使用 `lazy: "locale"` 时，访客只下载所打开页面的词典，并且只下载所用语言的部分。参见[懒加载](./lazy-loading.md)。
- 预加载下一次导航需要的内容（`preloadDictionaries(dialex, "checkout")`），这样页面不必等待下载。

## 带审核步骤的翻译

- `dx translate` 用 `[TODO]` 占位符或机器翻译填充缺失的键。把它的输出当作其他变更：合并前审查 diff。
- 提交 `dialex.lock.json`。它记录每条翻译所基于的源文本，因此 `dx check` 和 `dx translate --stale` 能发现英文已更改而翻译没有更改。
- 发布前搜索 `[TODO]`。`dx check` 会报告仍然存在的每个占位符。

## 用真实的词典测试

- 使用应用所用的同一个 `dialex` 导出来渲染组件，并断言某个 locale 的文本。[测试](./testing.md)提供了 React 和 Vue 的包装器。
- 至少测试默认 locale 和另一个 locale，让缺失的键或复数形式在测试运行中暴露，而不是在生产环境中。

## 配合编辑器使用

- 安装 [VS Code 扩展](./vscode.md)，或通过语言服务器使用 [Zed 与其他编辑器](./zed.md)。你会获得针对键的诊断、悬停提示、转到定义、自动补全和快速修复。
- 把词典保存到变量中（`const home = useDictionary("home")`），编辑器仍然能解析 `home.title`。
- 让生成文件和构建输出不参与扫描：Dialex 已经遵守 `.gitignore`，其余内容可用 `dialex.config.ts` 中的 `exclude` 处理。

## 检查清单

| 发布之前                  | 命令或设置                                 |
| ------------------------- | ------------------------------------------ |
| 词典与生成文件一致        | `dx check --fail-on-stale`                 |
| 没有缺失的键或 locale     | `dx check`                                 |
| 没有遗留占位符            | `[TODO]`                                   |
| 翻译与源文本一致          | `dx translate --stale`, `dialex.lock.json` |
| `<html lang>` 跟随 locale | provider 或服务端标记                      |
| bundle 只包含所需词典     | `lazy: "locale"`                           |
