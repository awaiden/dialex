# Fetch API (Request)

`dialexjs/web` 从标准的 `Request` 解析 locale。可用于任何向你提供 `Request` 的框架或运行时：React Router 和 Remix 的 loader、TanStack Start、SolidStart、Cloudflare Workers、Deno、Bun。

```ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated.js";

export const resolveDialex = createDialexHandler({ ...dialex });

const { locale, getDictionary, t, headers, applyHeaders } = await resolveDialex(request);
```

| 结果                     | 说明                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `locale`                 | 检测到的 locale                                                                      |
| `getDictionary(name)`    | 该 locale 的词典内容，遵循[回退](../guide/fallbacks.md)                              |
| `t(path, ...args)`       | [键路径翻译函数](../guide/key-paths.md)                                              |
| `headers`                | `{ "Content-Language": locale }`（`setHeader` 为 `false` 时为空）                    |
| `applyHeaders(response)` | 返回带有这些请求头的响应；如果其请求头不可变（例如 `Response.redirect`），则会复制它 |

检测顺序和选项与其他适配器相同：参见 [Locale 检测](../guide/locale-detection.md)。

## 示例写法

这些示例展示各部分如何配合。Dialex 的测试只覆盖 `dialexjs/web` 本身；下面的框架接入尚未在真实应用中运行过，因此请对照你所用框架的最新文档进行核对。

### React Router / Remix

Loader 会接收 `Request`：

```ts
export async function loader({ request }: { request: Request }) {
  const { locale, getDictionary } = await resolveDialex(request);
  return { locale, title: getDictionary("home").title };
}
```

把数据返回给你的组件，并在那里渲染。如果你自己构造响应，请用 `applyHeaders` 包装它。

### TanStack Start 与 SolidStart

使用框架提供的服务端辅助函数读取当前请求，然后传给 `resolveDialex`。例如在 SolidStart 中，`getRequestEvent()?.request` 会返回当前的 `Request`。由于该调用需要服务端上下文，请在服务端函数或中间件中使用，而不是在客户端代码中。 在 TanStack Start 中，请在 `createServerFn` 处理函数内调用 `@tanstack/react-start/server` 的 `getRequest()`。[`examples/tanstack`](https://github.com/awaiden/dialex/tree/main/examples/tanstack) 应用在根路由的 `beforeLoad` 中这样做，并把结果作为 `initialLocale` 传给 `DialexProvider`；与这里的其他示例不同，它是在真实应用中运行的。

### Workers、Deno、Bun

```ts
export default {
  async fetch(request: Request) {
    const dialex = await resolveDialex(request);
    return dialex.applyHeaders(new Response(dialex.getDictionary("home").title));
  },
};
```
