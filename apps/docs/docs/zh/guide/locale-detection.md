# Locale 检测

服务器适配器（Express、Fastify、Koa、Hono、NestJS）按以下顺序，从多个来源解析请求的 locale：

1. 自定义提取函数（`custom`）
2. 路径的第一段（`/tr/...`），前提是 `usePath` 为 true 且已配置 `locales`（未配置 `locales` 时会忽略路径，因此 `/api` 这样的路径段不会被误认为 locale；匹配前会去掉查询字符串和片段）
3. 查询参数（`locale`、`lang`）
4. Cookie（`locale`、`lang`）
5. `Accept-Language` 请求头

第一个与受支持 locale 匹配的候选值胜出，否则使用 `defaultLocale`。带有 `q=0` 的 `Accept-Language` 条目会被忽略；Cookie 值中格式错误的百分号编码会原样使用，而不是抛出错误。

<a id="options"></a>

## 选项

所有适配器都接受以下选项（`LocaleResolverOptions`）：

| 选项            | 类型                                   | 默认值               | 说明                  |
| --------------- | -------------------------------------- | -------------------- | --------------------- |
| `defaultLocale` | `string`                               | `"en"`               | 回退 locale           |
| `locales`       | `string[]`                             | —                    | 受支持的 locale       |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | 查询参数名称          |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie 名称           |
| `headerKey`     | `string`                               | `"Accept-Language"`  | 要读取的请求头        |
| `usePath`       | `boolean`                              | `true`               | 检查 URL 路径的第一段 |
| `custom`        | `(req) => string \| null \| undefined` | —                    | 自定义提取函数        |

此外，每个适配器还有：`dictionaries`（词典映射，或 `defineDictionary` 结果的数组；省略时使用打包的注册表）和 `setHeader`（默认 `true`，设置 `Content-Language`）。

## 匹配规则

`matchLocale` 不区分大小写，并按顺序尝试：完全匹配、候选值的语言前缀（`en-US` → `en`），然后是前缀匹配的受支持 locale（`en` → `en-US`）。

## 辅助函数

适配器内部共用 `parseAcceptLanguage`、`matchLocale`、`resolveLocaleFromCandidates`、`extractCookieLocale` 和 `extractPathLocale`。它们位于 `src/resolver.ts`，不属于包的公开 `exports`。
