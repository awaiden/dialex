# 迁移到 Dialex

如何从 i18next、react-intl（FormatJS）、next-intl 或 vue-i18n 迁移过来。它们的思路大体对应；变化在于消息放在哪里（TypeScript 文件，而不是 JSON）以及如何调用它们（一个 `t`，词典名称在前）。

## 计划

1. **安装** `dialexjs` 和 `@dialexjs/cli`，并运行 `dialex init`（[快速开始](./getting-started.md)）。
2. **为每个命名空间或功能创建一个词典**，每个 locale 一个空对象：

   ```ts
   // src/home.content.ts
   import { defineDictionary } from "dialexjs";

   export default defineDictionary("home", { en: {}, tr: {} });
   ```

3. **把 JSON 展平**为每个 locale 一个文件，键以词典名称为前缀，然后**导入**它：

   ```json
   { "home.title": "Welcome", "home.nav.about": "About" }
   ```

   ```bash
   dialex import en.json --allow-new
   dialex import tr.json --allow-new
   ```

   `--allow-new` 会添加尚没有任何 locale 拥有的键。[`dialex import`](../cli/import.md) 会校验 ICU 消息并列出被拒绝的内容。

4. 在词典中**转换消息语法**（下一节）。
5. 在代码中**替换调用**，一次处理一个框架。
6. **运行 `dialex generate` 和 `dialex check`。** 缺失的键、不一致的参数和对不存在的键的调用会立刻暴露出来。

## 消息语法

Dialex 的消息是 [ICU MessageFormat](./icu.md)。如果你的消息已经是 ICU，直接复制即可。

| 你现有的                                              | 在 Dialex 中写成                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| i18next `Hello {{name}}`                              | `Hello {name}`                                                          |
| 带 `{{count}}` 的 i18next `key_one` / `key_other`     | `{count, plural, one {# item} other {# items}}`                         |
| i18next 上下文 `key_male` / `key_female`              | `{gender, select, male {...} female {...} other {...}}`                 |
| i18next 嵌套 `$t(other.key)`                          | 没有对应写法。重复文本，或使用调用 `t` 的函数消息                       |
| i18next 格式化 `{{val, number}}`                      | `{val, number}`；日期 `{when, date, medium}`                            |
| vue-i18n `{name}`                                     | 相同                                                                    |
| vue-i18n 管道 `no items \| one item \| {count} items` | `{count, plural, =0 {no items} one {one item} other {# items}}`         |
| vue-i18n 链接 `@:other.key`                           | 没有对应写法。重复文本                                                  |
| react-intl 和 next-intl 的 ICU 字符串                 | 相同，原样复制                                                          |
| 富文本标签 `<b>...</b>`                               | **不支持**：标签不会被解析。把消息按标记拆开，或编写返回 JSX 的函数消息 |

## 从 i18next 迁移

| i18next                                | Dialex                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `locales/<lng>/<ns>.json`              | `src/<ns>.content.ts`：`defineDictionary("<ns>", { en: {...}, tr: {...} })` |
| `useTranslation("home")`、`t("title")` | `useT("home")`、`t("home.title")`：词典名称是路径的一部分                   |
| `i18n.changeLanguage("tr")`            | 来自 `useDialex()` 的 `setLocale("tr")`                                     |
| `i18n.language`                        | 来自 `useDialex()` 的 `locale`                                              |
| `fallbackLng`                          | `dialex.config.ts` 中的 `defaultLocale` 和 `fallbacks`                      |
| `supportedLngs`                        | `locales`                                                                   |
| 语言检测插件                           | 服务端适配器，或 Provider 的 `initialLocale` 和 `persist`                   |
| 懒加载后端                             | `lazy: true` 或 `"locale"`；参见[懒加载](./lazy-loading.md)                 |

```tsx
// before
const { t } = useTranslation("home");
return <p>{t("items", { count })}</p>;

// after
const t = useT("home");
return <p>{t("home.items", { count })}</p>;
```

## 从 react-intl（FormatJS）迁移

| react-intl                                                            | Dialex                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 消息目录 `{ "home.title": "..." }`                                    | 相同的扁平键：`dialex import` 直接接受它们（`home` 成为词典）                    |
| `<IntlProvider locale messages>`                                      | `<DialexProvider {...dialex}>`                                                   |
| `intl.formatMessage({ id }, values)`、`<FormattedMessage>`            | `t("home.title", values)`                                                        |
| `defineMessages`、消息提取                                            | 不需要：键放在词典里，`dialex check` 会找出未知的键                              |
| `intl.formatNumber`、`formatDate`、`formatRelativeTime`、`formatList` | 来自 `dialexjs` 的 `number`、`date`、`relativeTime`、`list`，第一个参数是 locale |
| `intl.locale`                                                         | 来自 `useDialex()` 的 `locale`                                                   |

```tsx
// before
<FormattedMessage id="home.items" values={{ count }} />;

// after
{
  t("home.items", { count });
}
```

## 从 next-intl 迁移

| next-intl                               | Dialex                                                     |
| --------------------------------------- | ---------------------------------------------------------- |
| `messages/<locale>.json`                | `*.content.ts` 词典（展平 JSON 并用 `dialex import` 导入） |
| `useTranslations("home")`、`t("title")` | `useT("home")`、`t("home.title")`                          |
| Server Component 中的 `getTranslations` | 来自 `createDialexServer(dialex)` 的 `getT(locale)`        |
| `createMiddleware(routing)`             | `createDialexMiddleware({ locales, defaultLocale })`       |
| `createNavigation` 的 `Link`            | `DialexLink`                                               |
| `t.rich(...)`                           | 不支持。使用返回 JSX 的函数消息                            |
| `NextIntlClientProvider`                | `DialexProvider {...dialex}`                               |

完整配置见 [Next.js](../frameworks/nextjs.md)。

## 从 vue-i18n 迁移

| vue-i18n                                  | Dialex                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| `createI18n({ locale, messages })`        | `createDialex({ ...dialex })` 和 `app.use(...)`               |
| `useI18n()`、`t("home.title")`、`$t(...)` | `useT("home")` 和 `t("home.title")`                           |
| `locale.value = "tr"`                     | 来自 `useDialex()` 的 `setLocale("tr")`                       |
| `fallbackLocale`                          | `defaultLocale` 和 `fallbacks`                                |
| 用于复数的消息管道                        | ICU `plural`                                                  |
| Nuxt `@nuxtjs/i18n`                       | `dialexjs/nuxt` 模块；参见 [Vue / Nuxt](../frameworks/vue.md) |

## Dialex 没有的东西

开始之前先看一下这些；每一项在上面都有变通办法。

- 消息中的富文本标签（`<b>`、`t.rich`）：使用返回标记的函数消息。
- 嵌套或链接的消息（`$t(...)`、`@:key`）：重复文本。
- 作为独立概念的命名空间：词典就是命名空间。
- 在运行时从服务器加载翻译：翻译随应用一起发布（参见[常见问题](./faq.md)）。
- 伪本地化以及从代码中自动提取键：键放在词典里，`dialex check` 会对照你的代码进行验证。

## 完成之后

- [ ] `dialex check` 以 `0` 退出
- [ ] `dialex check` 在 CI 中运行，使生成的文件和一致性保持准确
- [ ] 旧的 i18n 包及其 JSON 文件已移除
- [ ] 编辑器装有 [Dialex 扩展](./vscode.md)，可以在 `t("...")` 上悬停和转到定义
