# React / Vite

<a id="vite-plugin"></a>

## Vite 插件

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
```

`dialexPlugin(inlineConfig?)` 会加载你的配置，重新生成 `src/dialex-env.d.ts`，并提供两个虚拟模块 `virtual:dialex-dictionaries` 和 `virtual:dialex-config`；当 `.content.ts` 文件变化时支持 HMR。如果设置了 `locales`，缺少其中任何一个 locale 的词典都会导致构建失败。

该插件还会为 `dialexjs` 自动设置 `ssr.noExternal` 和 `optimizeDeps.exclude`，因此服务端渲染（例如基于 Vite 的 TanStack Start 或 React Router）无需额外的 Vite 配置即可工作。`include` 是相对于项目根目录的普通 glob，与 CLI 使用的相同；开头的 `/` 也可以。

## Provider 与 Hooks

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";

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
  <DialexProvider defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| 导出                  | 说明                                                         |
| --------------------- | ------------------------------------------------------------ |
| `DialexProvider`      | 保存当前 locale。参见下面的 props                            |
| `useDialex()`         | 返回 `{ locale, setLocale }`。在 provider 之外使用会抛出错误 |
| `useDictionary(name)` | 返回当前 locale 的词典，并回退到默认 locale                  |

## Provider 的 props

| Prop            | 默认值              | 说明                                                                                                           |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | 配置，然后是 `"en"` | 在没有其他依据时使用的 locale                                                                                  |
| `initialLocale` |                     | 首先渲染的 locale。请传入服务端渲染时使用的 locale，以便 hydration 一致。设置后，挂载时不会应用已记住的 locale |
| `persist`       | `"cookie"`          | 选择记住在哪里：`"cookie"`、`"localStorage"` 或 `false`                                                        |
| `storageKey`    | `"locale"`          | Cookie 或 localStorage 的键                                                                                    |

Provider 先渲染默认 locale，然后在挂载后应用已记住的 locale（仅当它属于已配置的 `locales`）。这样首次客户端渲染与服务端渲染的标记完全一致，代价是回访用户会多一次渲染。要避免这一点，请在服务端读取 Cookie，并将其作为 `initialLocale` 传入。`<html lang>` 会与当前 locale 保持同步。

`useT(...dictionaryNames)` 返回一个 [`t` 函数](../guide/key-paths.md)。启用[懒加载](../guide/lazy-loading.md)后，`useDictionary` 会挂起，直到它的词典加载完成。
