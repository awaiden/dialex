# Solid

`dialexjs/solid` 为 SolidJS 提供上下文 provider 和细粒度的访问器。词典是一个访问器，JSX 读取 `home().title`，locale 变化时只有用到它的文本节点会更新。

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
import { DialexProvider } from "dialexjs/solid";
import { render } from "solid-js/web";

import App from "./App";
import { dialex } from "./dialex.generated";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);
```

## 使用词典

`useDictionary(name)` 返回一个访问器。在 JSX 或 effect 中调用它，读取才会被追踪：

```tsx
import { useDictionary, useT } from "dialexjs/solid";
import { createSignal } from "solid-js";

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = createSignal(2);

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: count() })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

`useT(...names)` 返回 `t("dictionary.key", values?)` 函数。值会根据 ICU 消息进行类型检查，因此上面的 `count` 必须是数字。

## 切换 locale

`useDialex()` 返回 `locale` 访问器和 `setLocale`。provider 会把选择记在 `locale` cookie 中，并保持 `<html lang>` 同步：

```tsx
import { useDialex } from "dialexjs/solid";
import { For } from "solid-js";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale()} onChange={(event) => setLocale(event.currentTarget.value)}>
      <For each={locales}>{(code) => <option value={code}>{code.toUpperCase()}</option>}</For>
    </select>
  );
}
```

## API

| 导出                           | 说明                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | 向组件树提供 locale 和词典。属性：生成的 `dictionaries`、`config`、`loaders`，以及 `defaultLocale`、`initialLocale`、`persist`（`"cookie"`、`"localStorage"` 或 `false`）、`storageKey`、`onLocaleChange(locale)` |
| `useDialex()`                  | 返回 `{ locale, setLocale, store }`。`locale` 是访问器。在 `DialexProvider` 之外调用会抛出错误                                                                                                                    |
| `useDictionary(name)`          | 当前 locale 词典的访问器，遵循回退链。locale 变化或懒加载词典完成时更新                                                                                                                                           |
| `useT(...names)`               | 随当前 locale 变化的 `t("dictionary.key", values?)` 函数。使用懒加载时请列出词典名称以便加载                                                                                                                      |

## 懒加载

在 `dialex.config.ts` 中设置 `lazy: true` 或 `"locale"` 时，`useDictionary` 在词典加载前为空，加载后会更新访问器。用 `preloadDictionaries` 预加载下一个视图需要的内容：

```ts
import { preloadDictionaries } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## 最佳实践

- 在使用处读取访问器（`{home().title}`），不要在组件顶部读取一次存入普通变量。从访问器中复制出来的值在 locale 变化时不会更新。
- 在组件创建时（顶层）调用 `useDictionary` 和 `useT`，因为它们会读取 Solid 的上下文。不要在事件处理函数中调用。
- 对列表和条件使用 `<For>` 和 `<Show>`，其中放入词典中的文本；Dialex 字符串是普通值，可与 Solid 的所有控制流组件配合使用。
- 对含数字或选项的文本使用 ICU 消息，并传入响应式值（`count()`），这样值变化时消息会重新渲染。

## 故障排除

- **`useDialex must be used within a DialexProvider`**：组件渲染在 provider 之外。请用 `<DialexProvider {...dialex}>` 包裹根节点。
- **locale 变化时文本不变**：访问器在 JSX 或 effect 之外只读取了一次。请在渲染文本的位置调用 `home()`。
- **键没有自动补全**：运行 `dx generate`，并把 `dialex-env.d.ts` 加入 `tsconfig`。当 `package.json` 中有 `solid-js` 时，CLI 会添加 `dialexjs/solid` 的声明。
