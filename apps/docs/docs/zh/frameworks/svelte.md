# Svelte

`dialexjs/svelte` 为 Svelte 4 和 5 组件提供 locale store 以及作为 store 的词典。它可用于纯 Vite 应用和 SvelteKit 组件。它使用 `svelte/store` 和 Svelte 的上下文，无需配置 runes 或编译步骤。SvelteKit 中服务端的 locale 检测请参见 [SvelteKit](./sveltekit.md)。

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

在根组件的脚本中用生成的 `dialex` 导出调用一次 `provideDialex`：

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "./dialex.generated";
  import Home from "./lib/Home.svelte";

  provideDialex({ ...dialex });
</script>

<Home />
```

## 使用词典

`useDictionary(name)` 返回一个包含当前 locale 词典的 store。在模板中加上 `$` 前缀。键是有类型的，并能根据你的词典自动补全：

```svelte
<!-- src/lib/Home.svelte -->
<script lang="ts">
  import { useDictionary } from "dialexjs/svelte";

  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<p>{$home.greeting("Alex")}</p>
```

## ICU 消息与复数

`useT(...names)` 返回一个包含 `t` 函数的 store。像 `$t("home.items", { count })` 这样调用；`count` 会根据消息进行类型检查。使用[懒加载](../guide/lazy-loading.md)时，请列出你读取的词典以便加载：

```svelte
<script lang="ts">
  import { useT } from "dialexjs/svelte";

  const t = useT("home");
  let count = $state(2);
</script>

<p>{$t("home.items", { count })}</p>
<button onclick={() => count++}>+1</button>
```

## 切换 locale

`useDialex()` 返回 `locale` store 和 `setLocale`。provider 会把选择记在 `locale` cookie 中，更新 `<html lang>`，所有 `$` store 都会随之更新：

```svelte
<script lang="ts">
  import { useDialex } from "dialexjs/svelte";

  import { locales } from "../dialex.generated";

  const { locale, setLocale } = useDialex();
</script>

<select value={$locale} onchange={(event) => setLocale(event.currentTarget.value)}>
  {#each locales as code (code)}
    <option value={code}>{code.toUpperCase()}</option>
  {/each}
</select>
```

## API

| 导出                                   | 说明                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provideDialex(source, options?)`      | 让 Dialex 对该组件及其下方所有内容可用。在根组件中调用一次。选项：`defaultLocale`、`initialLocale`、`persist`（`"cookie"`、`"localStorage"` 或 `false`）、`storageKey`、`onLocaleChange(locale)` |
| `useDialex()`                          | 返回 `{ locale, setLocale, store }`。`locale` 是可读 store。在 `provideDialex` 之下的组件之外调用会抛出错误                                                                                      |
| `useDictionary(name)`                  | 包含当前 locale 词典的可读 store，遵循回退链                                                                                                                                                     |
| `useT(...names)`                       | 当前 locale 的 `t("dictionary.key", values?)` 可读 store                                                                                                                                         |
| `createSvelteDialex(source, options?)` | 不依赖 Svelte 上下文的响应式核心，用于普通模块和测试。返回 `{ locale, setLocale, store, dictionary(name), translator(...names) }`                                                                |

## 服务端渲染与 SvelteKit

在 SvelteKit 中，用 [`dialexHandle`](./sveltekit.md) 在 `hooks.server.ts` 中解析 locale，从根 `+layout.server.ts` 返回它，并作为 `initialLocale` 传入，使服务端和客户端首次渲染一致：

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "../dialex.generated";

  let { data, children } = $props();

  provideDialex({ ...dialex }, { initialLocale: data.locale });
</script>

{@render children()}
```

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => ({ locale: locals.locale });
```

## 懒加载

在 `dialex.config.ts` 中设置 `lazy: true` 或 `"locale"` 时，`useDictionary` 在词典到达前返回空对象，随后更新 store。预加载下一页需要的内容：

```ts
import { preloadDictionaries } from "dialexjs/svelte";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## 测试

无需渲染组件即可测试响应式核心。`createSvelteDialex` 接收同一个 `dialex` 导出，并返回可用 `get` 读取的 store：

```ts
import { createSvelteDialex } from "dialexjs/svelte";
import { get } from "svelte/store";
import { expect, it } from "vitest";

import { dialex } from "./dialex.generated";

it("switches to Turkish", () => {
  const app = createSvelteDialex({ ...dialex }, { persist: false });
  const home = app.dictionary("home");

  expect(get(home).title).toBe("One dictionary, every language");
  app.setLocale("tr");
  expect(get(home).title).toBe("Tek sözlük, her dil");
});
```

## 最佳实践

- 只在根组件中调用 `provideDialex`。下层组件使用 `useDictionary` 和 `useT`；第二个 `provideDialex` 会开启一个独立的 locale。
- 在组件脚本的顶层调用 `useDictionary` 和 `useT`，因为它们使用 Svelte 的上下文。不要在事件处理函数中或 `await` 之后调用。
- 把词典读入 store 一次，在模板中使用 `$name.key`。当父组件可以向下传递文本时，避免在许多小组件中对同一名称重复调用 `useDictionary`。
- 只要由服务端决定 locale，就传入 `initialLocale`。否则 provider 会先显示默认 locale，挂载后再应用记住的 locale。

## 故障排除

- **`useDialex requires provideDialex() in a parent component`**：祖先组件中没有调用 `provideDialex`，或者它在使用 store 的组件之后才运行。请在根组件的脚本中调用它。
- **键没有自动补全**：运行 `dx generate`，并确认 `dialex-env.d.ts` 已被 `tsconfig` 包含。当 `package.json` 中有 `svelte` 时，CLI 会添加 `dialexjs/svelte` 的声明。
- **加载时语言闪烁**：服务端渲染了一种 locale，客户端却以另一种开始。把服务端的 locale 作为 `initialLocale` 传入。
