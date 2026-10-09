# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import dictionaries from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, {
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` 使用 `fastify-plugin` 包装（名称 `dialex-fastify`，Fastify `>=4`），因此请求装饰器在各个封装上下文之间都可见。它也是默认导出。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。
