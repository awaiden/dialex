# 测试

`dialexjs/testing` 帮助你在没有运行中的服务器、配置文件或打包器插件的情况下，测试使用 Dialex 的代码。它适用于任何测试运行器。

## `createTestDialex`

一个自包含的上下文，提供与你的应用相同的 `getDictionary` 和 `t`：

```ts
import { createTestDialex } from "dialexjs/testing";
import home from "../src/home.content";

const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });

dialex.getDictionary("home").title; // "Hoş Geldiniz"
dialex.t("home.greeting", "Ada"); // "Merhaba, Ada!"
dialex.withLocale("en").getDictionary("home").title; // "Welcome"
```

| 选项            | 默认值          | 说明                                                               |
| --------------- | --------------- | ------------------------------------------------------------------ |
| `dictionaries`  | 必填            | `defineDictionary` 的结果，或 `{ name: { locale: content } }` 映射 |
| `locale`        | `defaultLocale` | 当前 locale                                                        |
| `defaultLocale` | `"en"`          | 最终回退                                                           |
| `fallbacks`     |                 | 显式的[回退链](./fallbacks.md)                                     |

`withLocale(locale)` 返回一个新的上下文，原来的上下文不会改变。[回退](./fallbacks.md)和子标签截断的行为与应用中一致。

## `mockRequest`

构建一个标准的 `Request`，适配器会把它解析为你指定的 locale。用它来测试服务器、loader 和中间件：

```ts
import { mockRequest } from "dialexjs/testing";

const res = await app.request(mockRequest("/dashboard", { locale: "tr" }));
expect(res.headers.get("content-language")).toBe("tr");
```

| 选项                 | 默认值     | 说明                                                                                                   |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `locale`             |            | 请求应解析成的 locale                                                                                  |
| `via`                | `"header"` | 传递方式：`"header"`（`Accept-Language`）、`"cookie"`、`"query"`（`?locale=`）或 `"path"`（`/tr/...`） |
| `headers`、`cookies` |            | 额外的请求头和 Cookie                                                                                  |
| `method`、`body`     | `GET`      | 请求方法和请求体                                                                                       |

相对 URL 会基于 `http://localhost` 解析。它返回普通的 `Request`，因此可用于 `app.request()`（Hono，Elysia 的 `app.handle`）、`fetch` 处理函数、Next.js 中间件（`new NextRequest(mockRequest(...))`）以及 [Fetch API 处理函数](../frameworks/web.md)。

## 组件测试

调用 `useDictionary`、`useT` 或 `useDialex` 的组件需要 provider 提供词典。把生成的 `dialex` 导出（或你自己的 `dictionaries`）传给下面的测试辅助函数即可，不需要打包器插件或 mock。

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestDialexProvider } from "dialexjs/testing/react";
import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestDialexProvider` 会立即渲染 `locale`，并且从不读取或写入 Cookie 或 `localStorage`，因此测试之间不会互相泄漏状态。

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestDialex } from "dialexjs/testing/vue";
import { dialex } from "../dialex.generated";

const wrapper = mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
