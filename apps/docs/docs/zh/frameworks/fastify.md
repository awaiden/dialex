# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` 使用 `fastify-plugin` 包装（名称 `dialex-fastify`，Fastify `>=4`），因此请求装饰器在各个封装上下文之间都可见。它也是默认导出。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 安装

把你已在使用的框架包与 Dialex 一起安装，然后编译词典：

```bash
npm install dialexjs fastify
npm install -D @dialexjs/cli
npx dialex generate
```

## 选项

适配器接受 [locale 检测选项](../guide/locale-detection.md)、`dictionaries` 和 `setHeader`。每个适配器的全部选项见[服务端适配器](../api/server-adapters.md)。

## TypeScript

`dialex generate` 会写出 `dialex-env.d.ts`。把它包含进 `tsconfig.json`（并把 `moduleResolution` 设为 `"bundler"` 或 `"nodenext"`）之后，`request.getDictionary("home")` 会自动补全词典名称并为内容提供类型，`locale` 则是你配置的 locale 的联合类型。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给适配器。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在根实例上、路由和其他插件之前只注册一次该插件，这样 `req.locale` 和 `req.getDictionary` 在各处都可用。
- 读取适配器已解析好的 locale，而不是自己解析 `Accept-Language` 或 cookie，这样每个路由都与中间件保持一致。

## 故障排除

- **`req.getDictionary` 在路由中是 undefined**：路由先于插件注册。`await app.register(dialexPlugin, { ...dialex })` 必须先完成。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
