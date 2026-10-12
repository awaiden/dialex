# Qwik

`dialexjs/qwik` 把 Qwik hooks 绑定到你的词典。Qwik 会把组件状态序列化到 HTML 中并在客户端恢复，而词典包含无法序列化的函数，所以它们留在自己的模块中。只有当前 locale（一个字符串）会随页面传输。

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

在一个模块中绑定一次 hooks，并从那里导入：

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

在根布局中调用 `useDialexProvider()`：

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

import { useDialexProvider } from "../i18n";

export default component$(() => {
  useDialexProvider();
  return <Slot />;
});
```

## 使用词典

`useDictionary(name)` 返回当前 locale 词典的访问器，因此 JSX 读取 `home().title`，`useT()` 返回一个 `t("dictionary.key", values?)` 函数。读取它们的组件会在 locale 变化时重新渲染：

```tsx
import { component$ } from "@builder.io/qwik";

import { useDictionary, useT } from "../i18n";

export default component$(() => {
  const home = useDictionary("home");
  const t = useT();

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: 2 })}</p>
    </>
  );
});
```

值会根据 ICU 消息做类型检查，因此上面的 `count` 必须是数字。

## 切换 locale

`useDialex()` 返回提供者的状态，`setLocale(state, locale)` 用来更改它。`setLocale` 是普通函数，因此 `onClick$` 可以使用它，而不会捕获任何无法序列化的内容：

```tsx
import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();

  return (
    <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
});
```

`setLocale` 会把选择记在 `locale` cookie 中，并保持 `<html lang>` 同步。

## 在服务器上解析 locale

在 `routeLoader$` 中用 [`dialexjs/web`](./web.md) 从请求中解析 locale，并交给提供者。这样服务器的首次渲染与恢复后的客户端就保持一致：

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";
import { useDialexProvider } from "../i18n";

const resolveDialex = createDialexHandler({ ...dialex });

export const useLocale = routeLoader$(async ({ request }) => {
  const { locale } = await resolveDialex(request);
  return locale;
});

export default component$(() => {
  const locale = useLocale();
  useDialexProvider({ initialLocale: locale.value });
  return <Slot />;
});
```

## API

`createDialexQwik({ ...dialex })` 接受生成的 `dictionaries`、`config` 和 `loaders`，以及 `persist`（`"cookie"`、`"localStorage"` 或 `false`）和 `storageKey`。它返回：

| 导出                                   | 说明                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| `useDialexProvider({ initialLocale })` | 向下方的组件提供 locale。在根布局中只调用一次                         |
| `useDialex()`                          | 返回提供者的状态 `{ locale }`。读取 `locale`；用 `setLocale` 更改它   |
| `setLocale(state, locale)`             | 更改 locale、记住它，并保持 `<html lang>` 同步                        |
| `getPersistedLocale()`                 | 此浏览器中记住的 locale（如果应用支持）。在服务器上为 `undefined`     |
| `useDictionary(name)`                  | 当前 locale 词典的访问器，遵循回退链。在 JSX 中调用它：`home().title` |
| `useT()`                               | 绑定到当前 locale 的 `t("dictionary.key", values?)` 函数              |

## 链接和导航

如果 URL 带有 locale（`/tr/about`），请用 [路由辅助函数](../guide/routing.md) 中的 `localizePath` 和应用当前显示的 locale 来构建链接。Dialex 没有提供适用于 Qwik City 的链接组件：自己写的几行代码就能让 `useNavigate()` 和重定向以同样的方式工作，也能让你清楚看到路径发生了什么。生成的 `config` 已包含 `locales`、`defaultLocale` 和 `prefixDefault`，无需重复。

```tsx
import { component$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { localizePath } from "dialexjs/routing";

import { config } from "./dialex.generated";
import { useDialex } from "./i18n";

export const Nav = component$(() => {
  const dialex = useDialex();
  const navigate = useNavigate();
  const localize = (path: string) => localizePath(path, dialex.locale, config);

  return (
    <>
      <Link href={localize("/about")}>About</Link>
      <button onClick$={() => navigate(localizePath("/cart", dialex.locale, config))}>Cart</button>
    </>
  );
});
```

## 最佳实践

- 在一个模块中用 `createDialexQwik` 创建 hooks，并从该模块导入。不要在组件内部调用 `createDialexQwik`，因为词典不能成为组件状态的一部分。
- 在需要它的组件中读取 `useDialex().locale`，而不是在布局中，这样变化时只有该组件重新渲染。
- 对服务端渲染的页面，从 `routeLoader$` 传入 `initialLocale`，这样有已记住 locale 的访客不会看到默认语言的闪现。
- 使用懒加载时，在 `routeLoader$` 中用 `await preloadDictionaries(dialex, "home")`，使服务器渲染时就有文本。在浏览器中，加载完成后组件会重新渲染。
- 在 JSX 中调用访问器（`home().title`），不要把 `home()` 的结果一次性复制到变量里。locale 变化时，Qwik 不会刷新对复制出来的对象的普通属性读取。

## 故障排除

- **hooks 找不到提供者**：组件渲染在提供者之外。请在组件上方的布局中调用 `useDialexProvider()`。
- **Qwik 报告某个值无法序列化**：词典或 `useT()` 的结果被 `$` 闭包捕获了，例如 `onClick$`。请在组件渲染时读取所需的文本，只把普通值传入闭包。
- **键没有自动补全**：运行 `dx generate`，并把 `dialex-env.d.ts` 包含进 `tsconfig`。当 `package.json` 中有 `@builder.io/qwik` 时，CLI 会添加 `dialexjs/qwik` 的声明。
