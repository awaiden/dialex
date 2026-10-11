# AdonisJS

`dialexjs/adonis` 为 AdonisJS 6 及更高版本构建一个中间件类。在中间件文件中创建它：

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });
```

上面的导入从 `start/` 读取生成的文件。在 `dialex.config.ts` 中设置 `output` 使其生成到那里（`dialex init` 会为 AdonisJS 这样做）：

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "start/dialex.generated.ts",
});
```

把它注册为路由中间件，使它对每个路由都生效：

```ts
// start/kernel.ts
import router from "@adonisjs/core/services/router";

router.use([() => import("#middleware/dialex_middleware")]);
```

处理器随后读取 `ctx.locale` 和 `ctx.getDictionary(name)`：

```ts
// start/routes.ts
import router from "@adonisjs/core/services/router";

router.get("/:locale", ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { title: dict.title, locale };
});
```

该中间件还会设置 `Content-Language` 响应头。所有 [locale 检测选项](../guide/locale-detection.md#options)均适用。

## 最佳实践

- 把 `dialex.generated.ts` 中的 `{ ...dialex }` 传给 `createDialexMiddleware`。它同时带有词典和 locale 配置，因此 `defaultLocale`、`locales` 和 `fallbacks` 只需在 `dialex.config.ts` 中写一次。
- 用 `router.use` 注册，而不是只注册在单个路由上，这样每个路由都能看到 locale 和 `Content-Language` 头。
- 在处理器中从上下文解构 `locale` 和 `getDictionary`；二者在整个请求期间都已设置。

## 故障排除

- **`ctx.getDictionary is not a function`**：中间件没有注册，或其所属的路由没有被它覆盖。请在 `start/kernel.ts` 中用 `router.use` 添加。
- **`ctx.locale` 出现类型错误**：`dialexjs/adonis` 的声明不在你的项目中。运行 `dx generate`，并把 `dialex-env.d.ts` 包含进 `tsconfig`。
- **始终是默认 locale**：没有任何来源匹配请求。顺序为 URL 前缀（`/tr/...`）、`?locale=` 或 `?lang=`、`locale` cookie，然后是 `Accept-Language`。请检查客户端实际发送了哪一个。
