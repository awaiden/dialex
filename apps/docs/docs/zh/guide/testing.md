# 测试

`dialex/testing` 帮助你在没有运行中的服务器、配置文件或打包器插件的情况下，测试使用 Dialex 的代码。它适用于任何测试运行器。

## `createTestI18n`

一个自包含的上下文，提供与你的应用相同的 `getDictionary` 和 `t`：

```ts
import { createTestI18n } from "dialex/testing";
import home from "../src/home.content";

const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });

i18n.getDictionary("home").title; // "Hoş Geldiniz"
i18n.t("home.greeting", "Ada"); // "Merhaba, Ada!"
i18n.withLocale("en").getDictionary("home").title; // "Welcome"
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
import { mockRequest } from "dialex/testing";

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

调用 `useDictionary`、`useT` 或 `useI18n` 的组件会读取插件的虚拟模块，所以你的测试运行器需要 Dialex 的 Vite 插件。Vitest 使用你的 `vite.config.ts`，如果插件已经在其中，就不需要其他配置。

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestI18nProvider } from "dialex/testing/react";

render(
  <TestI18nProvider locale="tr">
    <Header />
  </TestI18nProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestI18nProvider` 会立即渲染 `locale`，并且从不读取或写入 Cookie 或 `localStorage`，因此测试之间不会互相泄漏状态。

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestI18n } from "dialex/testing/vue";

const wrapper = mount(Header, { global: { plugins: [createTestI18n("tr")] } });
```

::: tip 没有 Vite 插件时
如果无法把插件加入测试配置，可以改为模拟这两个虚拟模块（`vi.mock("virtual:dialex-dictionaries", ...)` 和 `vi.mock("virtual:dialex-config", ...)`）。Dialex 自己的测试套件就是这样做的。
:::
