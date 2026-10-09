# Angular

`dialexjs/angular` 以 Angular signal 的形式提供当前 locale、词典和 `t`。

::: warning 版本
基于 Angular 22 开发和测试。它只使用 `signal`、`computed`、`inject`、`InjectionToken`、`makeEnvironmentProviders` 和 `afterNextRender`，因此是为 Angular 17 及更高版本编写的，但较旧的版本尚未测试。它尚未在 Angular CLI 应用中运行过；测试是在 DOM 环境中驱动一个真实的 Angular 应用 injector。
:::

## 设置

Angular 像服务端适配器一样显式接收词典。用 CLI 生成它们：

```bash
dialex generate        # writes src/dialex.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialexjs/angular";
import dictionaries from "../dialex.generated";

export const appConfig: ApplicationConfig = {
  providers: [
    provideDialex({
      dictionaries,
      defaultLocale: "en",
      locales: ["en", "tr"],
    }),
  ],
};
```

每当你修改词典时，请重新运行 `dialex generate`（或 `dialex generate --watch`）。

## 在组件中使用

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectDialex, injectT } from "dialexjs/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ dialex.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly dialex = injectDialex();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.dialex.setLocale(this.dialex.locale() === "en" ? "tr" : "en");
  }
}
```

| 函数                     | 返回                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `injectDialex()`         | store：`locale`（一个 `Signal<string>`）、`setLocale(locale)`、`dictionary(name)`、`t` |
| `injectDictionary(name)` | 一个包含当前 locale 词典的 `Signal`，遵循[回退](../guide/fallbacks.md)                 |
| `injectT()`              | 当前 locale 的 [`t` 函数](../guide/key-paths.md)，支持 [ICU](../guide/icu.md)          |

请在注入上下文中调用它们，例如字段初始化器或构造函数。由于 `t` 每次被调用时都会读取 locale signal，因此在模板中调用它，会让该模板在 locale 变化时保持最新。

### 为什么没有 `| t` 管道

Angular 管道需要 Angular 自己的编译器，而 Dialex 与它的其他适配器一样以纯 JavaScript 发布。`t` 函数在模板中的用法相同：`{{ t('home.title') }}`。

## 选项

| 选项            | 默认值     | 说明                                                                                                     |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | 必填       | `defineDictionary` 的结果，或 `{ name: { locale: content } }` 映射，通常来自 `dialex generate`           |
| `defaultLocale` | `"en"`     | 在没有其他依据时使用的 locale                                                                            |
| `locales`       |            | 受支持的 locale。不在此列表中的已记住 locale 会被忽略                                                    |
| `fallbacks`     |            | 显式的[回退链](../guide/fallbacks.md)                                                                    |
| `initialLocale` |            | 首先渲染的 locale：可以是字符串，也可以是在注入上下文中运行的函数。设置后，之后不会再应用已记住的 locale |
| `persist`       | `"cookie"` | 选择记住在哪里：`"cookie"`、`"localStorage"` 或 `false`                                                  |
| `storageKey`    | `"locale"` | Cookie 或 localStorage 的键                                                                              |

已记住的 locale 在首次渲染之后应用，因此服务端渲染的标记与首次客户端渲染始终一致。`<html lang>` 会跟随当前 locale。

## 服务端渲染

使用 Angular SSR 时，首次渲染发生在服务端，因此请把 `initialLocale` 作为函数传入，告诉 Dialex 请求想要哪个 locale。它在注入上下文中运行，所以可以 `inject()` 你的服务端提供的内容：

```ts
import { inject } from "@angular/core";
import { REQUEST } from "@angular/core"; // location depends on your Angular SSR version

provideDialex({
  dictionaries,
  initialLocale: () => {
    const request = inject(REQUEST, { optional: true });
    const cookie = request?.headers.get("cookie") ?? "";
    return /(?:^|;\s*)locale=([^;]+)/.exec(cookie)?.[1] ?? "en";
  },
});
```

::: warning 未经测试的写法
`initialLocale` 函数有测试覆盖，但这个 `REQUEST` 示例尚未在真实的 Angular SSR 环境中运行过。该令牌的名称和导入路径在不同 Angular 版本之间发生过变化；请查阅你所用版本的 SSR 文档。
:::

## 懒加载

词典在启动时传入，因此[懒加载](../guide/lazy-loading.md)不适用于 Angular。要拆分较大的词典，只需把你需要的词典导入到传入的 `dictionaries` 中。

## 测试

`provideDialex` 在 `TestBed` 中与任何 provider 一样工作：

```ts
TestBed.configureTestingModule({
  providers: [provideDialex({ dictionaries, defaultLocale: "tr", persist: false })],
});
```

对于不需要 Angular 的代码，请使用 [`createTestDialex`](../guide/testing.md)。
