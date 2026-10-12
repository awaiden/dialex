# Preact

`dialexjs/preact` 为 Preact 10 及更高版本提供上下文提供者和 hooks。它不需要 `preact/compat`，因此可用于使用纯 Preact API 的应用。

## 安装

安装运行时和 CLI：

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## 设置

用你的 locale 创建 `dialex.config.ts`（或运行 `dialex init`，它还会添加依赖包和一个起始词典）：

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

把词典写在使用它的代码旁边。每个 locale 都有相同的键：

```ts
// src/home.content.ts
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

用 `DialexProvider` 包裹应用，并把生成的 `dialex` 导出展开传入：

```tsx
// src/index.tsx
import { DialexProvider } from "dialexjs/preact";
import { render } from "preact";

import { App } from "./app";
import { dialex } from "./dialex.generated";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);
```

## 使用词典

`useDictionary(name)` 返回当前 locale 的词典，`useT(...names)` 返回一个 `t("dictionary.key", values?)` 函数：

```tsx
import { useDictionary, useT } from "dialexjs/preact";
import { useState } from "preact/hooks";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

值会根据 ICU 消息做类型检查，因此上面的 `count` 必须是数字。

## 切换 locale

`useDialex()` 返回当前的 `locale` 和 `setLocale`。提供者会把选择记在 `locale` cookie 中，并保持 `<html lang>` 同步：

```tsx
import { useDialex } from "dialexjs/preact";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale} onChange={(event) => setLocale(event.currentTarget.value)}>
      {locales.map((code) => (
        <option value={code}>{code.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

## 服务端渲染

配合 `preact-render-to-string` 或 Fresh 之类的框架，把服务器解析出的 locale 作为 `initialLocale` 传入，使标记与客户端首次渲染一致。用 [`dialexjs/web`](./web.md) 从请求中解析它：

```tsx
import { DialexProvider } from "dialexjs/preact";
import { createDialexHandler } from "dialexjs/web";
import { renderToString } from "preact-render-to-string";

import { App } from "./app";
import { dialex } from "./dialex.generated";

const resolveDialex = createDialexHandler({ ...dialex });

export async function render(request: Request) {
  const { locale } = await resolveDialex(request);
  return renderToString(
    <DialexProvider {...dialex} initialLocale={locale}>
      <App />
    </DialexProvider>,
  );
}
```

## API

| 导出                           | 说明                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | 向组件树提供 locale 和词典。属性：生成的 `dictionaries`、`config`、`loaders`，以及 `defaultLocale`、`initialLocale`、`persist`（`"cookie"`、`"localStorage"` 或 `false`）、`storageKey`、`onLocaleChange(locale)` |
| `useDialex()`                  | 返回 `{ locale, setLocale, store }`。在 `DialexProvider` 之外会抛出错误                                                                                                                                           |
| `useDictionary(name)`          | 当前 locale 的词典，遵循回退链。locale 变化以及懒加载词典加载完成时，组件会重新渲染                                                                                                                               |
| `useT(...names)`               | 绑定到当前 locale 的 `t("dictionary.key", values?)` 函数。用懒加载时，传入词典名称以加载它们                                                                                                                      |
| `useDialexConfig()`            | 生成的 `config`（`locales`、`defaultLocale`、`prefixDefault`）                                                                                                                                                    |

## 懒加载

在 `dialex.config.ts` 中设置 `lazy: true` 或 `"locale"` 后，词典加载完成之前 `useDictionary` 返回空对象，加载完成时组件会重新渲染。用 `preloadDictionaries` 预加载下一个视图所需的内容：

```ts
import { preloadDictionaries } from "dialexjs/preact";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## 链接和导航

如果 URL 带有 locale（`/tr/about`），请用 [路由辅助函数](../guide/routing.md) 中的 `localizePath` 和应用当前显示的 locale 来构建链接。Dialex 没有提供适用于 preact-iso 的链接组件：自己写的几行代码就能让 `route()` 和重定向以同样的方式工作，也能让你清楚看到路径发生了什么。生成的 `config` 已包含 `locales`、`defaultLocale` 和 `prefixDefault`，无需重复。

```tsx
import { useDialex } from "dialexjs/preact";
import { localizePath } from "dialexjs/routing";
import { useLocation } from "preact-iso";

import { config } from "./dialex.generated";

export function Nav() {
  const { locale } = useDialex();
  const { route } = useLocation();
  const localize = (path: string, to = locale) => localizePath(path, to, config);

  return (
    <>
      <a href={localize("/about")}>About</a>
      <button onClick={() => route(localize("/cart"))}>Cart</button>
    </>
  );
}
```

## 最佳实践

- 只在根部渲染一次 `DialexProvider`。它下面的所有组件共享同一个 locale 和同一批已加载的词典。
- 在服务端渲染时传入 `initialLocale`。否则服务器渲染默认 locale，记住的 locale 在挂载后才应用。
- 在组件顶层调用 hooks，与任何 Preact hook 一样。
- 对带数字或选择的文本用 `useT("home")`，普通字符串从 `useDictionary("home")` 读取。

## 故障排除

- **`useDialex must be used within a DialexProvider`**：组件渲染在 provider 之外。请用 `<DialexProvider {...dialex}>` 包裹根节点。
- **加载时文本闪现默认语言**：记住的 locale 在挂载后才应用。请在服务器上解析它，并作为 `initialLocale` 传入。
- **键没有自动补全**：运行 `dx generate`，并把 `dialex-env.d.ts` 包含进 `tsconfig`。当 `package.json` 中有 `preact` 时，CLI 会添加 `dialexjs/preact` 的声明。
