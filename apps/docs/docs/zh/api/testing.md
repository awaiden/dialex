# 测试

用于单元测试和组件测试的辅助函数。它们不需要打包器插件、配置文件或生成文件，也从不触碰 Cookie 或 `localStorage`，因此测试之间不会互相泄漏状态。完整示例见[测试](../guide/testing.md)。

## `dialexjs/testing`

### `createTestDialex(options)`

```ts
function createTestDialex(options: TestDialexOptions): TestDialex;
```

| 选项            | 类型                       | 默认值          | 说明                                                                     |
| --------------- | -------------------------- | --------------- | ------------------------------------------------------------------------ |
| `dictionaries`  | `DictionaryInput`          | —               | `defineDictionary` 的结果，或 `{ name: { locale: content } }` 映射。必填 |
| `locale`        | `string`                   | `defaultLocale` | 当前 locale                                                              |
| `defaultLocale` | `string`                   | `"en"`          | 回退 locale                                                              |
| `fallbacks`     | `Record<string, string[]>` | —               | 显式的[回退链](../guide/fallbacks.md)                                    |

返回一个 `TestDialex`：

| 成员                  | 说明                                         |
| --------------------- | -------------------------------------------- |
| `locale`              | 当前 locale                                  |
| `getDictionary(name)` | 当前 locale 下某个词典的内容，包含回退       |
| `t`                   | 当前 locale 的 [`t` 函数](./core.md#createt) |
| `withLocale(locale)`  | 基于同一批词典、使用另一个 locale 的新上下文 |

```ts
const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
```

### `mockRequest(url, options?)`

```ts
function mockRequest(url: string, options?: MockRequestOptions): Request;
```

构建一个标准的 `Request`，服务端适配器会把它解析为 `options.locale`。相对 URL 以 `http://localhost` 为基准解析。

| 选项      | 类型                                        | 默认值     | 说明                                                                             |
| --------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `locale`  | `string`                                    | —          | 请求应解析成的 locale                                                            |
| `via`     | `"header" \| "cookie" \| "query" \| "path"` | `"header"` | locale 的传递方式：`Accept-Language`、`locale` Cookie、`?locale=` 或开头的路径段 |
| `headers` | `Record<string, string>`                    | —          | 更多请求头                                                                       |
| `cookies` | `Record<string, string>`                    | —          | 更多 Cookie                                                                      |
| `method`  | `string`                                    | `"GET"`    | HTTP 方法                                                                        |
| `body`    | `BodyInit \| null`                          | —          | 请求体                                                                           |

```ts
const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
```

## `dialexjs/testing/react`

### `TestDialexProvider`

```tsx
function TestDialexProvider(props: TestDialexProviderProps): ReactElement;
```

用于组件测试的 `DialexProvider`：它立即渲染 `locale`，并且从不读写 Cookie 或 `localStorage`。给它传入生成的 `dialex` 导出，或你自己的 `dictionaries`。

| 属性                                | 类型           | 说明                                    |
| ----------------------------------- | -------------- | --------------------------------------- |
| `locale`                            | `string`       | 用于渲染的 locale。默认：已配置的默认值 |
| `dictionaries`、`config`、`loaders` | `DialexSource` | Provider 读取的内容                     |
| `children`                          | `ReactNode`    | 被测试的组件                            |

```tsx
import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
```

## `dialexjs/testing/vue`

### `createTestDialex(locale?, source?)`

```ts
function createTestDialex(locale?: string, source?: DialexSource): VuePlugin;
```

用于组件测试的 Vue 插件，以 `locale` 启动且不做持久化。把生成的 `dialex` 导出或你自己的 `dictionaries` 作为 `source` 传入。

```ts
import { dialex } from "../dialex.generated";

mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
