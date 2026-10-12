# Koa

```ts
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

请在路由之前注册 `dialexKoa()`。它会添加 `ctx.locale` 和 `ctx.getDictionary(name)`。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 安装

把你已在使用的框架包与 Dialex 一起安装，然后编译词典：

```bash
npm install dialexjs koa
npm install -D @dialexjs/cli
npx dialex generate
```

## 选项

适配器接受 [locale 检测选项](../guide/locale-detection.md)、`dictionaries` 和 `setHeader`。每个适配器的全部选项见[服务端适配器](../api/server-adapters.md)。

## TypeScript

`dialex generate` 会写出 `dialex-env.d.ts`。把它包含进 `tsconfig.json`（并把 `moduleResolution` 设为 `"bundler"` 或 `"nodenext"`）之后，`ctx.getDictionary("home")` 会自动补全词典名称并为内容提供类型，`locale` 则是你配置的 locale 的联合类型。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在路由之前注册适配器，这样每个处理函数都能看到 locale 和 `getDictionary`。
- 用 `ctx.locale` 决定你发送的任何文本的语言，包括错误响应，使它们与页面的其余部分一致。

## 故障排除

- **`ctx.getDictionary is not a function`**：`dialexKoa()` 注册在路由器之后。请用 `app.use` 把它加在 `router.routes()` 之前。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
