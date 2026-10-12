# 客户端框架

面向 UI 框架的适配器：一个保存当前 locale 的 Provider（或插件），以及读取词典和 `t` 的 Hook 或 Store。带完整示例的指南在[框架页面](../frameworks/README.md)。

## 通用选项

大多数 Provider 接受生成的 `dialex` 对象（`dictionaries`、`config`、`loaders`：`{ ...dialex }`）以及这些选项：

| 选项             | 类型                                  | 默认值            | 说明                                                                             |
| ---------------- | ------------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `defaultLocale`  | `string`                              | 配置，然后 `"en"` | 没有其他依据时使用的 locale                                                      |
| `initialLocale`  | `string`                              | —                 | 首次渲染使用的 locale，例如服务端解析出的 locale。设置后不会应用已记住的 locale  |
| `persist`        | `"cookie" \| "localStorage" \| false` | `"cookie"`        | 在哪里记住用户的选择。它在挂载之后应用，因此服务端渲染的标记与客户端首次渲染一致 |
| `storageKey`     | `string`                              | `"locale"`        | Cookie 或 `localStorage` 的键                                                    |
| `onLocaleChange` | `(locale: string) => void`            | —                 | locale 改变之后调用                                                              |

Hook 和 Store 沿[回退链](../guide/fallbacks.md)返回当前 locale 的词典。使用 `lazy` 加载时，请指明某个 `t` 将读取的词典（`useT("home", "nav")`）以便加载它们；词典到达后组件会更新。

## React

`dialexjs/react`

| 导出                  | 签名                                           | 说明                                                                           |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `DialexProvider`      | `(props: DialexProviderProps) => ReactElement` | 提供 locale、`setLocale` 和词典。属性：通用选项、`children` 和 `{ ...dialex }` |
| `useDialex`           | `() => { locale, setLocale, store }`           | 上下文。在 Provider 之外会抛出异常                                             |
| `useDialexConfig`     | `() => DialexClientConfig`                     | 生成的配置，用于 `locales` 或 `prefixDefault`                                  |
| `useDictionary`       | `<K>(name: K) => ResolveDictionaryType<K>`     | 当前 locale 的词典。使用 `lazy` 时会挂起直到加载完成：请使用 `<Suspense>`      |
| `useT`                | `(...dictionaryNames: string[]) => Translate`  | 绑定到当前 locale 的 `t`                                                       |
| `preloadDictionaries` | 见[下文](#preloaddictionaries)                 | 开始加载懒加载词典                                                             |

## Preact

`dialexjs/preact` 的导出与 React 相同（`DialexProvider`、`useDialex`、`useDialexConfig`、`useDictionary`、`useT`、`preloadDictionaries`），属性使用 `ComponentChildren`。使用 `lazy` 时，词典在加载完成前是空对象，到达后组件会重新渲染；它不会挂起。无需 `preact/compat` 即可工作。

## Solid

`dialexjs/solid`

| 导出                  | 说明                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DialexProvider`      | 属性：通用选项、`children` 和 `{ ...dialex }`                                                                |
| `useDialex()`         | `{ locale, setLocale, store, loaded, ensureLoaded }`。`locale` 是访问器：以 `locale()` 读取                  |
| `useDictionary(name)` | 一个访问器：`const home = useDictionary("home")`，然后 `home().title`。locale 变化和懒加载词典加载完成时更新 |
| `useT(...names)`      | 跟随当前 locale 的 `t`。在 JSX 或 effect 中调用，结果才是响应式的                                            |
| `preloadDictionaries` | 见[下文](#preloaddictionaries)                                                                               |

## Vue

`dialexjs/vue`

| 导出                  | 签名                                                        | 说明                                                            |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `createDialex`        | `(options?: CreateDialexOptions) => Plugin & DialexContext` | 插件。选项：`{ ...dialex }`、`defaultLocale`、`onLocaleChange`  |
| `useDialex`           | `() => { locale: Ref<string>, setLocale, store }`           | 上下文。未安装插件时抛出异常                                    |
| `useDictionary`       | `<K>(name: K) => ComputedRef<ResolveDictionaryType<K>>`     | 作为计算 ref 的词典。使用 `lazy` 时加载完成前为空，SSR 会等待它 |
| `useT`                | `(...dictionaryNames: string[]) => Translate`               | 跟随 locale 的 `t`。在模板或 `computed` 中读取                  |
| `DIALEX_KEY`          | `InjectionKey<DialexContext>`                               | 上下文的注入键                                                  |
| `preloadDictionaries` | 见[下文](#preloaddictionaries)                              | 开始加载懒加载词典                                              |

## Nuxt

`dialexjs/nuxt` 是一个 Nuxt 模块：`modules: ["dialexjs/nuxt"]`。它使用来自 `dialex.generated.ts`、由 Cookie 支撑的 locale 安装 Vue 插件，并自动导入 `useDialex` 和 `useDictionary`。选项写在 `nuxt.config.ts` 的 `dialex` 键下：

| 选项         | 类型     | 默认值     | 说明                                                                 |
| ------------ | -------- | ---------- | -------------------------------------------------------------------- |
| `cookieName` | `string` | `"locale"` | 记住 locale 的 Cookie                                                |
| `generated`  | `string` | 自动查找   | 生成文件的路径，不含扩展名。会在源码目录、项目根目录或 `src/` 中查找 |

它同样接受 `DialexConfig` 的字段。请先运行 `dialex generate`：模块读取的就是它写出的文件。

## Svelte

`dialexjs/svelte`

| 导出                                    | 说明                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `provideDialex(source?, options?)`      | 在根组件中带 `{ ...dialex }` 调用一次。返回 `DialexSvelte`                       |
| `useDialex()`                           | 最近的 `provideDialex` 的 `{ locale, setLocale, store, dictionary, translator }` |
| `useDictionary(name)`                   | 一个 Store：`const home = useDictionary("home")`，然后 `$home.title`             |
| `useT(...names)`                        | `t` 的 Store：`const t = useT("home")`，然后 `$t("home.title")`                  |
| `createSvelteDialex(source?, options?)` | 不依赖组件上下文的响应式核心，用于普通模块和测试                                 |
| `preloadDictionaries`                   | 见[下文](#preloaddictionaries)                                                   |

`options` 是通用选项（`defaultLocale`、`initialLocale`、`persist`、`storageKey`、`onLocaleChange`）。

## Qwik

`dialexjs/qwik`

```ts
function createDialexQwik(options?: CreateDialexQwikOptions): {
  useDialexProvider(options?: UseDialexProviderOptions): DialexState;
  useDialex(): DialexState;
  setLocale(state: DialexState, locale: string): void;
  useDictionary<K>(name: K): () => ResolveDictionaryType<K>;
  useT(): Translate;
  getPersistedLocale(): string | undefined;
};
```

在一个单独的模块中调用一次 `createDialexQwik({ ...dialex })`，并从那里导入各个 Hook；这样词典就不会被序列化进页面。`DialexState` 是 `{ locale: string; loaded: number }`，是 Qwik 可以恢复的普通数据。`persist` 和 `storageKey` 是通用选项；读回已保存的 locale 由服务端负责（`getPersistedLocale`）。

## Lit

`dialexjs/lit`

| 导出                     | 说明                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options?)` | 创建 locale 状态：`{ locale, config, store, setLocale, subscribe, getDictionary, t }`。在单独的模块中创建一次                                       |
| `DialexController`       | 适用于任何 `ReactiveControllerHost` 的响应式控制器：`new DialexController(this, i18n)`。含 `locale`、`setLocale`、`dictionary(name)`、`t(...names)` |
| `preloadDictionaries`    | 见[下文](#preloaddictionaries)                                                                                                                      |

## `dialexjs/react-native`

| 导出                                                                           | 说明                                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `DialexProvider`                                                               | 面向 React Native 和 Expo 的 Provider。属性见下方                                         |
| `useDialex`、`useDialexConfig`、`useDictionary`、`useT`、`preloadDictionaries` | 与 `dialexjs/react` 相同的 Hook                                                           |
| `LocaleStorage`                                                                | `{ getItem(key), setItem(key, value) }`，同步或异步：AsyncStorage、MMKV 或 `localStorage` |

| 属性                                               | 类型                 | 说明                                                                                  |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `deviceLocales`                                    | `string \| string[]` | 设备的语言，最优先的在前（`expo-localization` 的 `getLocales()`）。使用第一个受支持的 |
| `initialLocale`                                    | `string`             | 优先于 `deviceLocales` 和已保存的 locale                                              |
| `storage`                                          | `LocaleStorage`      | 在哪里记住用户的选择。读取完成后才渲染子节点                                          |
| `storageKey`                                       | `string`             | 存储键。默认 `"locale"`                                                               |
| `defaultLocale`、`onLocaleChange`、`{ ...dialex }` | —                    | 同通用选项                                                                            |

## Angular

`dialexjs/angular`

| 导出                       | 说明                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provideDialex(options)`   | 环境 Provider。`AngularDialexOptions`：`dictionaries`（必填）、`config`、`defaultLocale`、`locales`、`fallbacks`、`initialLocale`（字符串，或在注入上下文中运行的函数）、`persist`、`storageKey` |
| `injectDialex()`           | `DialexStore`：`locale`（一个 signal）、`setLocale`、`dictionary(name)`、`t`                                                                                                                     |
| `injectDictionary(name)`   | 作为 signal 的词典                                                                                                                                                                               |
| `injectT()`                | `t` 函数；它在每次调用时读取 locale signal，因此使用它的模板会保持最新                                                                                                                           |
| `DIALEX`、`DIALEX_OPTIONS` | Store 和选项的注入令牌                                                                                                                                                                           |

请在注入上下文中调用 `inject*` 函数。

## Next.js

| 导出                                                            | 说明                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `createDialexMiddleware(options)`（`dialexjs/next/middleware`） | 让每个页面都位于 locale 前缀之下。返回 `(request: NextRequest) => NextResponse`                          |
| `DialexLink`（`dialexjs/next/link`）                            | 在 URL 中保持 locale 的 `next/link`。上层需要 `DialexProvider`。属性：`next/link` 的属性，外加 `locale?` |

`createDialexMiddleware` 的选项：[路由选项](./routing.md)（`locales` 必填、`defaultLocale`、`prefixDefault`）、检测选项 `queryKeys`、`cookieKeys`、`headerKey`、`custom`、`fallbacks`，以及：

| 选项         | 类型                            | 默认值                               | 说明                                      |
| ------------ | ------------------------------- | ------------------------------------ | ----------------------------------------- |
| `cookieName` | `string`                        | `"locale"`                           | 记住访问者 locale 的 Cookie               |
| `setCookie`  | `boolean`                       | `true`                               | URL 的 locale 与已保存的不同时写入 Cookie |
| `ignore`     | `(pathname: string) => boolean` | `/_next`、`/api`、带文件扩展名的路径 | 跳过 locale 处理的路径                    |

## 类型

选项和属性的类型，以及哪个入口点使用它们：

| 类型                                                                 | 使用者                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `DialexProviderProps`                                                | `dialexjs/react`、`preact`、`solid` 和 `react-native` 的 `DialexProvider` |
| `DialexContext`                                                      | `dialexjs/react`、`preact`、`solid` 和 `vue` 的 `useDialex()`             |
| `CreateDialexOptions`                                                | `dialexjs/vue` 和 `dialexjs/lit` 的 `createDialex`                        |
| `Dialex`                                                             | `dialexjs/lit` 的 `createDialex` 返回的状态                               |
| `DialexOptions`, `DialexSvelte`                                      | `dialexjs/svelte` 的 `provideDialex` 和 `createSvelteDialex`              |
| `CreateDialexQwikOptions`, `UseDialexProviderOptions`, `DialexState` | `createDialexQwik` 及其 Hook，`dialexjs/qwik`                             |
| `AngularDialexOptions`, `DialexStore`                                | `dialexjs/angular` 的 `provideDialex` 和 `injectDialex`                   |
| `NuxtDialexOptions`                                                  | `dialexjs/nuxt` 的模块选项                                                |
| `DialexLinkProps`, `DialexMiddlewareOptions`                         | Next.js 的 `DialexLink` 和 `createDialexMiddleware`                       |
| `LocaleStorage`                                                      | `dialexjs/react-native` 的 `storage` 属性                                 |

## `preloadDictionaries`

```ts
function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void>;
```

开始加载懒加载词典；如果词典不是懒加载的，它什么也不做。在 `lazy: "locale"` 模式下，除非先传入 `{ locale }`，否则它加载默认 locale。

```ts
await preloadDictionaries(dialex, { locale: "tr" }, "checkout", "cart");
```
