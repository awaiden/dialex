# tRPC

`dialexjs/trpc` 把 locale 和词典放进 tRPC 上下文，使每个过程都能翻译自己的错误和消息。它不依赖 `@trpc/server`；它读取你的适配器本来就传给 `createContext` 的请求。通过头、cookie 和查询字符串的检测适用于所有适配器；使用 Express 和 standalone 适配器时，`req.url` 相对于挂载路径，因此只有把完整 URL 传入 `url` 时，才能看到 URL 路径中的 locale 前缀。

```ts
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { title: dict.title, locale: ctx.locale };
  }),
});
```

`resolveDialex(request)` 返回 `{ locale, getDictionary, t }`。把它展开到你自己的上下文中，与会话或数据库句柄放在一起。

## 请求的形式

参数可以是 Fetch 的 `Request`（fetch、Next.js 和 Cloudflare 适配器传入的就是它），也可以是任何带有 `headers` 和可选 `url` 的对象（Express 和 standalone 适配器传入的就是这种）：

```ts
// Express adapter
createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ ...resolveDialex(req) }),
});
```

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给 `createDialexContext`。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 在模块级别只创建一次 `resolveDialex`，并在 `createContext` 内按请求调用。
- 用 `ctx.getDictionary("errors")` 构造 `TRPCError` 的消息，使客户端收到自己语言的文本。
- tRPC 调用通常来自你自己的前端。把 locale 作为 `locale` cookie 或 `Accept-Language` 头发送（浏览器会自动完成），而不是作为每个过程的输入。

## 故障排除

- **locale 始终是默认值**：使用 Express 适配器时，`req.url` 相对于挂载路径，因此路径中的 locale 前缀看不到。请改用 cookie 或 `Accept-Language`，或在 `url` 中传入原始 URL。
- **`[dialex] Dictionary "x" not found`**：该词典不在 `dialex.generated.ts` 中。运行 `dx generate`，并检查 `dialex.config.ts` 中的 `include` 是否匹配该文件。
- **过程中缺少 `ctx.getDictionary`**：`createContext` 没有返回 `resolveDialex` 的结果。把它展开到你返回的对象中。
