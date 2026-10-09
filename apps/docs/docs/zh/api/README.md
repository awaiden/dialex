# API 参考

## `dialexjs`

### `defineConfig(config)`

用于为 `dialex.config.ts` 提供类型的恒等辅助函数。参见[配置](../guide/configuration.md)。

### `defineDictionary(name, dictionary)` / `defineDictionary({ name, dictionary })`

定义并注册一个词典。返回 `DictionaryDefinition<N, T>`：`{ name, dictionary }`。

### 格式化辅助函数

`plural`、`number`、`date`、`relativeTime`、`list` 和 `formatters(locale)`。参见[格式化与复数](../guide/formatting.md)。

### `formatMessage(locale, message, values?)`、`parseMessage(message)`

格式化或解析 [ICU 消息](../guide/icu.md)。也可以不引入运行时的其余部分，从 `dialexjs/icu` 使用，同时提供 `getArguments` 和 `isIcuStructured`。

### `createT(getDictionary, locale?)`

构建带类型的 `t("dictionary.key.path", ...args)`。参见[键路径](../guide/key-paths.md)。

### 类型

| 类型                                        | 说明                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DialexConfig`                              | `defaultLocale`、`locales`、`include`、`configFile`、`fallbacks`、`prefixDefault`、`lazy`、`translate` |
| `Translate`、`TranslationPath`              | `t` 及其有效路径的类型                                                                                 |
| `Register`                                  | 由生成的声明扩展（`locales`）                                                                          |
| `Locales`                                   | 已配置 locale 的联合类型，或 `string`                                                                  |
| `DictionaryRegistry`                        | 以你的词典名称和内容类型进行扩展                                                                       |
| `DictionaryKey`、`ResolveDictionaryType<K>` | 键和内容的类型辅助工具                                                                                 |
| `Dictionary<T>`                             | `Record<Locales, T>`                                                                                   |
| `DictionaryDefinition<N, T>`                | `defineDictionary` 的返回类型                                                                          |
| `globalDictionaries`                        | 由 `defineDictionary` 填充的进程内注册表                                                               |

## `dialexjs/server`

`getDictionary(name, locale?)` 返回某个 locale 的词典内容，`getT(locale?)` 返回一个 `t` 函数。参见 [Next.js](../frameworks/nextjs.md)。

## `dialexjs/react`

`DialexProvider`、`useDialex`、`useDictionary`、`useT`、`preloadDictionaries`。参见 [React / Vite](../frameworks/react.md)。

## `dialexjs/vite`

`dialexPlugin(inlineConfig?)`。参见 [React / Vite](../frameworks/react.md)。

## `dialexjs/next`

`withDialex(nextConfig, inlineConfig?)`。参见 [Next.js](../frameworks/nextjs.md)。

## `dialexjs/vue` 和 `dialexjs/nuxt`

`createDialex`、`useDialex`、`useDictionary`、`useT`、`preloadDictionaries` 以及 Nuxt 模块。参见 [Vue / Nuxt](../frameworks/vue.md)。

## 服务端适配器

`dialexjs/express`（`dialex`）、`dialexjs/fastify`（`dialexPlugin`）、`dialexjs/koa`（`dialex`）、`dialexjs/hono`（`dialex`）、`dialexjs/nestjs`（`DialexModule` 及相关项）、`dialexjs/elysia`（`dialex`）、`dialexjs/sveltekit`（`dialexHandle`）、`dialexjs/astro`（`dialex`）。共享的选项见 [Locale 检测](../guide/locale-detection.md#options)。

## `dialexjs/routing`

`localizePath`、`stripLocale`、`alternateLinks`、`alternateLanguages`、`sitemapEntries`。参见[路由辅助函数](../guide/routing.md)。

## `dialexjs/next/middleware` 和 `dialexjs/next/link`

`createDialexMiddleware(options)` 和 `DialexLink`。参见 [Next.js](../frameworks/nextjs.md)。

## `dialexjs/angular`

`provideDialex`、`injectDialex`、`injectDictionary`、`injectT`、`DIALEX`。参见 [Angular](../frameworks/angular.md)。

## `dialexjs/web` 和 `dialexjs/h3`

适用于任意 `Request` 的 `createDialexHandler(options)`，以及 h3 1.x 的 `dialex(options)` 中间件。参见 [Fetch API](../frameworks/web.md) 和 [h3 / Nitro](../frameworks/h3.md)。

## `dialexjs/testing`

`createTestDialex`、`mockRequest`，以及框架封装 `TestDialexProvider`（`dialexjs/testing/react`）和 `createTestDialex`（`dialexjs/testing/vue`）。参见[测试](../guide/testing.md)。

## `@dialexjs/cli/api`

`analyzeProject`、`readStaticConfig`、`scanReferences` 以及 [VS Code 扩展](../guide/vscode.md)所基于的词典编辑辅助函数。它们从语法树读取词典和配置，不会运行项目代码。

## `dialexjs/scanner`

适配器在未传入 `dictionaries` 选项时使用的运行时词典扫描。在生产环境中，请优先使用 `dialex generate` 编译出的注册表。
