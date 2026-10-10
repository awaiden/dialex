# React / Vite

<a id="setup"></a>

## 设置

没有打包器插件。`dx generate` 会写出 `src/dialex.generated.ts`，它导出 `dialex`：你的词典以及配置中可安全用于客户端的副本。用展开语法传给 provider：

```tsx
import { DialexProvider } from "dialexjs/react";
// src/main.tsx
import { createRoot } from "react-dom/client";

import App from "./App";
import { dialex } from "./dialex.generated";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);
```

在第二个终端中运行 `dx generate --watch` 让文件保持最新，或安装会在保存时重新生成它的 VS Code 扩展。文件过期时 `dx check` 会失败，因此忘记运行会在 CI 中被发现。由于没有任何东西接入打包器，服务端渲染（例如基于 Vite 的 TanStack Start 或 React Router）无需额外的 Vite 配置即可工作。

## Provider 与 Hooks

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";

import { dialex } from "./dialex.generated";

function App() {
  const { locale, setLocale } = useDialex();
  const dict = useDictionary("home");

  return (
    <div>
      <h1>{dict.title}</h1>
      <button onClick={() => setLocale(locale === "en" ? "tr" : "en")}>
        Switch Locale ({locale})
      </button>
    </div>
  );
}

export default () => (
  <DialexProvider {...dialex} defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| 导出                  | 说明                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | 保存当前 locale 和词典。属性：`children`、生成的 `dialex`（`dictionaries`、`config`、`loaders`）以及 `defaultLocale`（回退到配置，再回退到 `"en"`） |
| `useDialex()`         | 返回 `{ locale, setLocale }`。在 provider 之外使用会抛出错误                                                                                        |
| `useDictionary(name)` | 返回当前 locale 的词典，并回退到默认 locale                                                                                                         |

## Provider 的 props

| Prop            | 默认值              | 说明                                                                                                           |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | 配置，然后是 `"en"` | 在没有其他依据时使用的 locale                                                                                  |
| `initialLocale` |                     | 首先渲染的 locale。请传入服务端渲染时使用的 locale，以便 hydration 一致。设置后，挂载时不会应用已记住的 locale |
| `persist`       | `"cookie"`          | 选择记住在哪里：`"cookie"`、`"localStorage"` 或 `false`                                                        |
| `storageKey`    | `"locale"`          | Cookie 或 localStorage 的键                                                                                    |
| `dictionaries`  |                     | 来自 `dialex.generated.ts` 的词典（用 `{...dialex}` 展开）                                                     |
| `config`        |                     | 同一文件中可安全用于客户端的配置：`locales`、`defaultLocale`、`fallbacks`、`prefixDefault`、`lazy`             |
| `loaders`       |                     | 在[懒加载模式](../guide/lazy-loading.md)下提供：在首次使用时加载每个词典                                       |

Provider 先渲染默认 locale，然后在挂载后应用已记住的 locale（仅当它属于已配置的 `locales`）。这样首次客户端渲染与服务端渲染的标记完全一致，代价是回访用户会多一次渲染。要避免这一点，请在服务端读取 Cookie，并将其作为 `initialLocale` 传入。`<html lang>` 会与当前 locale 保持同步。

`useT(...dictionaryNames)` 返回一个 [`t` 函数](../guide/key-paths.md)。启用[懒加载](../guide/lazy-loading.md)后，`useDictionary` 会挂起，直到它的词典加载完成。

## 最佳实践

- 在根部只渲染一个 `DialexProvider`。嵌套的 provider 会开启彼此独立的 locale，这通常不是你想要的。
- 使用服务端渲染（Next.js 客户端组件、React Router、TanStack Start）时，从请求中传入 `initialLocale`。否则 provider 会先显示默认 locale，挂载后再应用记住的 locale。
- 使用懒加载时，用 `<Suspense>` 包裹读取词典的那部分树：`useDictionary` 会在词典到达前挂起，`setLocale` 使用 transition，因此期间旧语言仍然可见。

## 故障排除

- **`useDialex must be used within a DialexProvider`**：组件渲染在 provider 之外，例如 portal 根节点或测试中。请包裹它，或使用[测试包装器](../guide/testing.md)。
- **关于文本的水合警告**：服务端渲染了一种 locale，客户端首次渲染使用了另一种。请把服务端的 locale 作为 `initialLocale` 传入。
- **`getDictionary` 返回 `any`**：缺少类型注册表。运行 `dx generate`，并确认 `dialex-env.d.ts` 已被 `tsconfig` 包含。
