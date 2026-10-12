# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

该中间件会把 `locale` 和 `getDictionary` 设置为上下文变量，通过 `c.var` 读取。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 安装

把你已在使用的框架包与 Dialex 一起安装，然后编译词典：

```bash
npm install dialexjs hono
npm install -D @dialexjs/cli
npx dialex generate
```

## 选项

适配器接受 [locale 检测选项](../guide/locale-detection.md)、`dictionaries` 和 `setHeader`。每个适配器的全部选项见[服务端适配器](../api/server-adapters.md)。

## TypeScript

`dialex generate` 会写出 `dialex-env.d.ts`。把它包含进 `tsconfig.json`（并把 `moduleResolution` 设为 `"bundler"` 或 `"nodenext"`）之后，`c.var.getDictionary("home")` 会自动补全词典名称并为内容提供类型，`locale` 则是你配置的 locale 的联合类型。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在路由之前注册适配器，这样每个处理函数都能看到 locale 和 `getDictionary`。
- 适配器只读取请求和你传入的词典，因此可在 Hono 支持的任何运行时上运行（Node、Bun、Deno、Workers）。

## 故障排除

- **`c.var.getDictionary` 是 undefined**：中间件没有覆盖该路由。请在路由之前用 `app.use("*", dialexHono({ ...dialex }))` 注册。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
