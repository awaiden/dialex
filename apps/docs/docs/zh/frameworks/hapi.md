# Hapi

```ts
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });

await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/{locale}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return { title: dict.title, locale: request.locale };
  },
});

await server.start();
```

在路由之前注册 `dialexPlugin`。它为每个请求添加 `request.locale` 和 `request.getDictionary(name)`，并设置 `Content-Language` 响应头，错误响应也不例外。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 作为插件选项传入。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在读取 locale 的路由之前注册插件。locale 在 `onRequest` 扩展点解析，因此在生命周期的每个后续步骤中都可用，包括认证和校验。
- 用 `request.locale` 选择你发送的所有文本的语言，包括 `Boom` 错误消息，使它们与页面其余部分一致。

## 故障排除

- **`request.getDictionary is not a function`**：插件没有注册在拥有该路由的服务器上。请把它注册到根服务器，或定义该路由的插件上。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
