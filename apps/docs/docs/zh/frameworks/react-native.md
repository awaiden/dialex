# React Native

`dialexjs/react-native` 是 React Native 和 Expo 应用的提供者。原生应用没有 cookie、没有 `localStorage`，也没有 URL，因此提供者接收设备的语言和你已经在用的存储，而 hooks 与 [React](./react.md) 中的相同。

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

用 `DialexProvider` 包裹应用。使用 Expo 时，从 `expo-localization` 读取设备语言，并用 AsyncStorage 记住用户的选择：

```tsx
// App.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DialexProvider } from "dialexjs/react-native";
import { getLocales } from "expo-localization";

import { dialex } from "./src/dialex.generated";
import { Home } from "./src/Home";

export default function App() {
  return (
    <DialexProvider
      {...dialex}
      deviceLocales={getLocales().map((locale) => locale.languageTag)}
      storage={AsyncStorage}
    >
      <Home />
    </DialexProvider>
  );
}
```

提供者会选择应用支持的第一个设备语言，然后在读取完成后立即应用 `storage` 中记住的 locale，并把之后的每次更改写回去。

## 使用词典

`useDictionary(name)` 和 `useT(...names)` 的用法与 React 中一样：

```tsx
import { useDictionary, useT } from "dialexjs/react-native";
import { useState } from "react";
import { Button, Text, View } from "react-native";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <View>
      <Text>{home.title}</Text>
      <Text>{home.greeting("Alex")}</Text>
      <Text>{t("home.items", { count })}</Text>
      <Button title="+1" onPress={() => setCount((n) => n + 1)} />
    </View>
  );
}
```

值会根据 ICU 消息做类型检查，因此上面的 `count` 必须是数字。

## 切换 locale

`useDialex()` 返回当前的 `locale` 和 `setLocale`：

```tsx
import { useDialex } from "dialexjs/react-native";
import { Button, View } from "react-native";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <View>
      {locales.map((code) => (
        <Button
          key={code}
          title={code.toUpperCase()}
          disabled={code === locale}
          onPress={() => setLocale(code)}
        />
      ))}
    </View>
  );
}
```

## 存储

`storage` 是任何带有 `getItem(key)` 和 `setItem(key, value)` 的对象，同步的或返回 promise 的都可以。AsyncStorage 适用，对 MMKV 或 `expo-secure-store` 的简单封装也适用：

```ts
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

export const storage = {
  getItem: (key: string) => mmkv.getString(key),
  setItem: (key: string, value: string) => mmkv.set(key, value),
};
```

## API

| 导出                           | 说明                                                                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | 向组件树提供 locale 和词典。属性：生成的 `dictionaries`、`config`、`loaders`，以及 `deviceLocales`（字符串或数组，最优先的在前）、`storage`、`storageKey`（默认 `"locale"`）、`defaultLocale`、`initialLocale`、`onLocaleChange(locale)` |
| `useDialex()`                  | 返回 `{ locale, setLocale, store }`。在 `DialexProvider` 之外会抛出错误                                                                                                                                                                  |
| `useDictionary(name)`          | 当前 locale 的词典，遵循回退链。使用懒加载时，在词典加载完成之前会挂起（suspend）                                                                                                                                                        |
| `useT(...names)`               | 绑定到当前 locale 的 `t("dictionary.key", values?)` 函数。用懒加载时，传入词典名称以加载它们                                                                                                                                             |
| `useDialexConfig()`            | 生成的 `config`（`locales`、`defaultLocale`、`prefixDefault`）                                                                                                                                                                           |

## 最佳实践

- 在根部、导航之上只放一个 `DialexProvider`，使每个屏幕共享 locale。
- 传入 `deviceLocales`，使首次启动时以设备语言打开。之后以保存的选择为准。
- 使用 `storage` 时，在读取到保存的 locale 之前不会渲染任何内容，因此第一个界面就已经是正确的语言。在此之前保持启动画面（splash）不消失。
- 只有当你自己决定 locale 时才传入 `initialLocale`，例如来自账户设置。它优先于设备和存储。
- 设备语言只在用户做出选择之前有意义。在设置界面中显示该选择，并从那里调用 `setLocale`。

## 故障排除

- **`useDialex must be used within a DialexProvider`**：组件渲染在提供者之外。请用 `<DialexProvider {...dialex}>` 包裹根组件。
- **应用以默认语言打开**：`deviceLocales` 中没有任何条目与已配置的 locale 匹配，或者没有传入 `deviceLocales`。`en-US` 匹配 `en`，但 `pt-BR` 不匹配 `en`。
- **选择没有被记住**：没有传入 `storage`。没有它时，选择只在应用重启之前有效。
- **键没有自动补全**：运行 `dx generate`，并把 `dialex-env.d.ts` 包含进 `tsconfig`。当 `package.json` 中有 `react-native` 或 `expo` 时，CLI 会添加 `dialexjs/react` 的声明，`dialexjs/react-native` 共用它们。
