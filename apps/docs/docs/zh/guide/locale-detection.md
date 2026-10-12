# Locale 检测

服务器适配器（Express、Fastify、Koa、Hono、Elysia、h3、Hapi、AdonisJS、NestJS、SvelteKit、Astro、tRPC 和 Fetch API 处理器）按以下顺序，从多个来源解析请求的 locale：

1. 自定义提取函数（`custom`）
2. 路径的第一段（`/tr/...`），前提是 `usePath` 为 true 且已配置 `locales`（未配置 `locales` 时会忽略路径，因此 `/api` 这样的路径段不会被误认为 locale；匹配前会去掉查询字符串和片段）
3. 查询参数（`locale`、`lang`）
4. Cookie（`locale`、`lang`）
5. `Accept-Language` 请求头

第一个与受支持 locale 匹配的候选值胜出，否则使用 `defaultLocale`。带有 `q=0` 的 `Accept-Language` 条目会被忽略；Cookie 值中格式错误的百分号编码会原样使用，而不是抛出错误。

<a id="options"></a>

## 选项

所有适配器都接受以下选项（`LocaleResolverOptions`）：

| 选项            | 类型                                   | 默认值               | 说明                                                               |
| --------------- | -------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `defaultLocale` | `string`                               | `"en"`               | 回退 locale                                                        |
| `locales`       | `string[]`                             | —                    | 受支持的 locale                                                    |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | 查询参数名称                                                       |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie 名称                                                        |
| `headerKey`     | `string`                               | `"Accept-Language"`  | 要读取的请求头                                                     |
| `usePath`       | `boolean`                              | `true`               | 检查 URL 路径的第一段                                              |
| `custom`        | `(req) => string \| null \| undefined` | —                    | 自定义提取函数                                                     |
| `config`        | `GeneratedConfig`                      | —                    | 生成的配置。填充未设置的 `defaultLocale`、`locales` 和 `fallbacks` |
| `fallbacks`     | `Record<string, string[]>`             | —                    | 显式的[回退链](./fallbacks.md)                                     |

除此之外，每个适配器还接受 `dictionaries`（映射或 `defineDictionary` 结果的数组；缺省时使用通过 `defineDictionary` 注册的词典）和 `setHeader`（默认 `true`；发送 `Content-Language`）。你显式传入的选项优先于生成的 `config`，生成的 `config` 又优先于默认值。每个适配器的全部选项见[服务端适配器](../api/server-adapters.md)。

## 匹配规则

`matchLocale` 不区分大小写，并按顺序尝试：完全匹配、候选值的语言前缀（`en-US` → `en`），然后是前缀匹配的受支持 locale（`en` → `en-US`）。

## 响应头

使用 `setHeader`（默认）时，解析出的 locale 会作为 `Content-Language` 发送。如果 CDN 或代理缓存了依赖 `Accept-Language` 的页面，还请同时发送 `Vary: Accept-Language`。

## 辅助函数

适配器内部共用 `parseAcceptLanguage`、`matchLocale`、`resolveLocaleFromCandidates`、`extractCookieLocale` 和 `extractPathLocale`。它们位于 `src/resolver.ts`，不属于包的公开 `exports`。
