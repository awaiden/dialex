# React Router

框架模式下的 React Router（v7 及更高版本，前身为 Remix）在服务端渲染，因此必须在请求上决定 locale 并交给客户端。Dialex 分两部分完成：`dialexjs/web` 在 loader 中从标准 `Request` 解析 locale，`dialexjs/react` 用该 locale 渲染应用。无需额外的适配器。`examples/react-router` 项目完整演示了这一过程。

## 安装

安装运行时和 CLI：

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## 设置

React Router 把源码放在 `app/` 中，因此用 `output` 告诉 Dialex 把生成文件写到哪里：

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
});
```

把词典写在使用它的代码旁边。每个 locale 都有相同的键：

```ts
// app/content/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    greeting: (name: string) => `Hello, ${name}!`,
    items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    greeting: (name: string) => `Merhaba, ${name}!`,
    items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}",
  },
});
```

把词典编译成 `dialex.generated.ts` 和类型声明。词典变化时再次运行，或保持 `dx generate --watch` 运行：

```bash
npx dx generate
```

## 在服务端检测 locale

只创建一次请求处理器。它从生成的配置读取 `defaultLocale`、`locales` 和 `fallbacks`，并依次从 `?lang=`、`locale` cookie、`Accept-Language` 和默认值中确定 locale。`.server` 后缀会让该文件不进入客户端 bundle：

```ts
// app/dialex.server.ts
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "./dialex.generated";

export const resolveDialex = createDialexHandler({ ...dialex });
```

## 用该 locale 渲染应用

从根 loader 返回 locale，把它放到 `<html lang>` 上，并作为 `initialLocale` 交给 provider，使客户端首次渲染与服务端 HTML 一致：

```tsx
// app/root.tsx
import { DialexProvider } from "dialexjs/react";
import { Links, Meta, Outlet, Scripts, useLoaderData, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/root";
import { dialex } from "./dialex.generated";
import { resolveDialex } from "./dialex.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { locale } = await resolveDialex(request);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Also renders for error pages, where the loader data may be missing.
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang={data?.locale ?? "en"}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  return (
    <DialexProvider {...dialex} initialLocale={locale}>
      <Outlet />
    </DialexProvider>
  );
}
```

## 在路由中使用词典

在组件中使用 `dialexjs/react` 的 hooks。在 loader 或 action 中，用同一个处理器获取服务端需要的文本，例如页面标题：

```tsx
// app/routes/home.tsx
import { useDictionary, useT } from "dialexjs/react";

import { resolveDialex } from "../dialex.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const { getDictionary } = await resolveDialex(request);
  return { title: getDictionary("home").title as string };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData.title }];
}

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count: 3 })}</p>
    </>
  );
}
```

## 切换 locale

`setLocale` 会更新 provider 并写入 `locale` cookie。之后重新验证 loader，让服务端渲染的部分（`<html lang>` 和 loader 文本）随之更新：

```tsx
import { useDialex } from "dialexjs/react";
import { useRevalidator } from "react-router";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const { revalidate } = useRevalidator();

  return (
    <select
      value={locale}
      onChange={(event) => {
        setLocale(event.target.value);
        void revalidate();
      }}
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

## 最佳实践

- 只在根 loader 中解析 locale，在子路由中用 `useRouteLoaderData("root")` 或从 provider 读取。在每个路由中重复解析既浪费又可能不一致。
- 服务端生成的文本（标题、邮件、错误信息）使用 `dialexjs/web`，组件中渲染的文本使用 React hooks。两者读取相同的词典。
- 当搜索引擎或缓存需要按语言区分时，使用处理器结果中的 `applyHeaders` 在响应上设置 `Content-Language`。
- 如果网站需要按语言被索引，请用[路由辅助函数](../guide/routing.md)为每种语言提供独立 URL（`/en/about`、`/tr/about`），而不要依赖 cookie。

## 故障排除

- **`Cannot find module './+types/root'`**：React Router 会生成路由类型。在类型检查之前运行 `react-router typegen`（示例的 `typecheck` 脚本会自动完成）。
- **找不到生成文件**：没有 `src/` 文件夹时，Dialex 会把它写到项目根目录。请在 `dialex.config.ts` 中设置 `output: "app/dialex.generated.ts"`。
- **水合不匹配或语言闪烁**：provider 渲染时没有传入 `initialLocale`。请传入 loader 返回的 locale。
- **切换后页面仍是旧语言**：loader 没有被重新验证。请在 `setLocale` 之后调用 `revalidate()`，或重新加载路由。
