# Lit

`dialexjs/lit` 可用于 Lit 和任何自定义元素。`createDialex()` 保存 locale 和词典，`DialexController` 是一个[响应式控制器](https://lit.dev/docs/composition/controllers/)，在 locale 变化时重新渲染元素。

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

在单独的模块中创建一次 locale 状态。每个元素都从那里导入它，因此它们共享同一个 locale：

```ts
// src/i18n.ts
import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });
```

## 使用词典

给元素添加一个 `DialexController`。`dictionary(name)` 返回当前 locale 的词典，`t(...names)` 返回一个 `t("dictionary.key", values?)` 函数：

```ts
import { DialexController } from "dialexjs/lit";
// src/home-page.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { i18n } from "./i18n";

@customElement("home-page")
export class HomePage extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    const home = this.dx.dictionary("home");
    const t = this.dx.t("home");

    return html`
      <h1>${home.title}</h1>
      <p>${home.greeting("Alex")}</p>
      <p>${t("home.items", { count: 2 })}</p>
    `;
  }
}
```

值会根据 ICU 消息做类型检查，因此上面的 `count` 必须是数字。

## 切换 locale

`setLocale` 会为所有使用该控制器的元素更改 locale。`createDialex` 把选择记在 `locale` cookie 中，在创建时应用它，并保持 `<html lang>` 同步：

```ts
import { DialexController } from "dialexjs/lit";
// src/language-switcher.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { locales } from "./dialex.generated";
import { i18n } from "./i18n";

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    return html`
      <select
        @change=${(event: Event) => this.dx.setLocale((event.target as HTMLSelectElement).value)}
      >
        ${locales.map(
          (code) =>
            html`<option value=${code} ?selected=${code === this.dx.locale}>${code}</option>`,
        )}
      </select>
    `;
  }
}
```

## 不使用 Lit

`createDialex` 不依赖 Lit。任何组件都可以读取 locale 并订阅变化，因此它也适用于普通自定义元素和其他库：

```ts
import { i18n } from "./i18n";

class PlainElement extends HTMLElement {
  private unsubscribe?: () => void;

  connectedCallback() {
    this.unsubscribe = i18n.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render() {
    this.textContent = i18n.getDictionary("home").title;
  }
}

customElements.define("plain-element", PlainElement);
```

## API

`createDialex({ ...dialex })` 接受生成的 `dictionaries`、`config` 和 `loaders`，以及 `defaultLocale`、`initialLocale`、`persist`（`"cookie"`、`"localStorage"` 或 `false`）、`storageKey` 和 `onLocaleChange(locale)`。

| 导出                                 | 说明                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `createDialex(options)`              | 创建共享的 locale 状态：`locale`、`setLocale`、`subscribe`、`getDictionary(name)`、`t(...names)` |
| `new DialexController(host, dialex)` | 一个响应式控制器。locale 变化或懒加载词典加载完成时，请求更新 `host`                             |
| `controller.locale`                  | 当前 locale                                                                                      |
| `controller.setLocale(locale)`       | 为所有使用同一个 `createDialex` 实例的元素更改 locale                                            |
| `controller.dictionary(name)`        | 当前 locale 的词典，遵循回退链                                                                   |
| `controller.t(...names)`             | 绑定到当前 locale 的 `t("dictionary.key", values?)` 函数。用懒加载时，传入词典名称以加载它们     |

## 懒加载

在 `dialex.config.ts` 中设置 `lazy: true` 或 `"locale"` 后，词典加载完成之前 `dictionary(name)` 返回空对象，加载完成时元素会重新渲染。用 `preloadDictionaries` 预加载下一个视图所需的内容：

```ts
import { preloadDictionaries } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## 链接和导航

如果 URL 带有 locale（`/tr/about`），请用 [路由辅助函数](../guide/routing.md) 中的 `localizePath` 和应用当前显示的 locale 来构建链接。Dialex 没有提供适用于 Lit 的链接组件：自己写的几行代码就能让 `location.assign()` 和重定向以同样的方式工作，也能让你清楚看到路径发生了什么。生成的 `config` 已包含 `locales`、`defaultLocale` 和 `prefixDefault`，无需重复。

```ts
import { localizePath } from "dialexjs/routing";
import { html } from "lit";

import { config } from "./dialex.generated";
import { i18n } from "./i18n";

const localize = (path: string, to = i18n.locale) => localizePath(path, to, config);

html`<a href=${localize("/about")}>About</a>`;

// Programmatic navigation without a router:
location.assign(localize("/cart"));
```

## 最佳实践

- 每个应用创建一个 `createDialex` 实例并导入它。两个实例不会共享 locale。
- 在 `render()` 中读取词典，使元素在 locale 变化后显示新文本。在构造函数中读取的值会停留在旧语言。
- 对带数字或选择的文本用 `t("home")`，普通字符串从 `dictionary("home")` 读取。
- 一个实例保存一个 locale，这适合浏览器。在服务器上不要在请求之间共享实例；为每个请求用 `initialLocale` 创建一个。

## 故障排除

- **locale 变化时元素没有更新**：控制器所用的 `createDialex` 实例与调用 `setLocale` 的实例不是同一个。请在所有地方导入同一个 `i18n` 模块。
- **懒加载时文本为空**：词典还没有到达。到达后元素会重新渲染；用 `preloadDictionaries` 提前加载。
- **键没有自动补全**：运行 `dx generate`，并把 `dialex-env.d.ts` 包含进 `tsconfig`。当 `package.json` 中有 `lit` 时，CLI 会添加 `dialexjs/lit` 的声明。
