# 键路径（`t`）

除了 `getDictionary(name).key`，`t` 还可以按点分路径读取值。它的类型来自生成的注册表，因此路径会自动补全，参数类型也会被检查。

```ts
t("home.title"); // "Welcome"
t("home.nav.about"); // nested objects use more dots
t("home.greeting", "Ada"); // function leaves receive the extra arguments
```

如果叶子节点是字符串，并且你传入了值对象，它会按 [ICU 消息](./icu.md)进行格式化：`t("cart.items", { count: 3 })`。

未知的路径会记录一条警告，并返回路径本身。

## 在哪里可用

| 环境           | 如何获取 `t`                                                  |
| -------------- | ------------------------------------------------------------- |
| React          | 来自 `dialexjs/react` 的 `const t = useT()`                   |
| Vue / Nuxt     | 来自 `dialexjs/vue` 的 `const t = useT()`                     |
| 服务端（Next） | 来自 `createDialexServer(dialex)` 的 `const t = getT(locale)` |
| Elysia         | 请求上下文中的 `t`                                            |
| SvelteKit      | `event.locals.t`                                              |
| Astro          | `Astro.locals.t`                                              |
| 其他任何地方   | 来自 `dialexjs` 的 `createT(getDictionary)`                   |

## 类型

运行 `dialex generate` 之后，注册表会扩展 `dialexjs` 模块，因此 `TranslationPath` 会变成类似 `"home.title" | "home.greeting" | "home.nav.about"` 的联合类型。传入未知路径或类型错误的参数都会产生编译错误：

```ts
t("home.greeting", 42); // Error: number is not assignable to string
t("home.nope"); // Error: not a valid path
```

在生成注册表之前，`t` 接受任意字符串。
