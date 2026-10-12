# Client frameworks

The adapters for UI frameworks: a provider (or plugin) that holds the active locale, and hooks or stores that read dictionaries and `t`. Guides with complete examples are on the [framework pages](../frameworks/README.md).

## Shared options

Most providers take the generated `dialex` object (`dictionaries`, `config`, `loaders`: `{ ...dialex }`) and these options:

| Option           | Type                                  | Default                 | Description                                                                                                            |
| ---------------- | ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale`  | `string`                              | the config, then `"en"` | Locale used when nothing else decides                                                                                  |
| `initialLocale`  | `string`                              | —                       | The locale to render first, for example the one the server resolved. When set, the remembered locale is not applied    |
| `persist`        | `"cookie" \| "localStorage" \| false` | `"cookie"`              | Where the choice is remembered. It is applied after mount, so server-rendered markup and the first client render agree |
| `storageKey`     | `string`                              | `"locale"`              | Cookie or `localStorage` key                                                                                           |
| `onLocaleChange` | `(locale: string) => void`            | —                       | Called after the locale changes                                                                                        |

Hooks and stores return the dictionary for the active locale following the [fallback chain](../guide/fallbacks.md). With `lazy` loading, name the dictionaries a `t` will read (`useT("home", "nav")`) so they are loaded; the component updates when they arrive.

## React

`dialexjs/react`

| Export                | Signature                                      | Description                                                                                              |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | `(props: DialexProviderProps) => ReactElement` | Provides locale, `setLocale` and dictionaries. Props: the shared options, `children` and `{ ...dialex }` |
| `useDialex`           | `() => { locale, setLocale, store }`           | The context. Throws outside a provider                                                                   |
| `useDialexConfig`     | `() => DialexClientConfig`                     | The generated config, for `locales` or `prefixDefault`                                                   |
| `useDictionary`       | `<K>(name: K) => ResolveDictionaryType<K>`     | The dictionary for the active locale. With `lazy` it suspends until loaded: use `<Suspense>`             |
| `useT`                | `(...dictionaryNames: string[]) => Translate`  | A `t` bound to the active locale                                                                         |
| `preloadDictionaries` | see [below](#preloaddictionaries)              | Starts loading lazy dictionaries                                                                         |

## Preact

`dialexjs/preact` has the same exports as React (`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`) with `ComponentChildren` props. With `lazy` the dictionary is an empty object until it has loaded, and the component re-renders when it arrives; it does not suspend. It works without `preact/compat`.

## Solid

`dialexjs/solid`

| Export                | Description                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Props: the shared options, `children` and `{ ...dialex }`                                                                         |
| `useDialex()`         | `{ locale, setLocale, store, loaded, ensureLoaded }`. `locale` is an accessor: read it as `locale()`                              |
| `useDictionary(name)` | An accessor: `const home = useDictionary("home")`, then `home().title`. Updates on locale change and when a lazy dictionary loads |
| `useT(...names)`      | A `t` that follows the current locale. Call it in JSX or an effect so the result is reactive                                      |
| `preloadDictionaries` | See [below](#preloaddictionaries)                                                                                                 |

## Vue

`dialexjs/vue`

| Export                | Signature                                                   | Description                                                                                  |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `createDialex`        | `(options?: CreateDialexOptions) => Plugin & DialexContext` | The plugin. Options: `{ ...dialex }`, `defaultLocale`, `onLocaleChange`                      |
| `useDialex`           | `() => { locale: Ref<string>, setLocale, store }`           | The context. Throws when the plugin is not installed                                         |
| `useDictionary`       | `<K>(name: K) => ComputedRef<ResolveDictionaryType<K>>`     | The dictionary as a computed ref. With `lazy` it is empty until loaded, and SSR waits for it |
| `useT`                | `(...dictionaryNames: string[]) => Translate`               | A `t` that follows the locale. Read it in a template or `computed`                           |
| `DIALEX_KEY`          | `InjectionKey<DialexContext>`                               | The injection key of the context                                                             |
| `preloadDictionaries` | See [below](#preloaddictionaries)                           | Starts loading lazy dictionaries                                                             |

## Nuxt

`dialexjs/nuxt` is a Nuxt module: `modules: ["dialexjs/nuxt"]`. It installs the Vue plugin with a cookie-backed locale from `dialex.generated.ts` and auto-imports `useDialex` and `useDictionary`. Options go under the `dialex` key of `nuxt.config.ts`:

| Option       | Type     | Default    | Description                                                                                                  |
| ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `cookieName` | `string` | `"locale"` | Cookie that remembers the locale                                                                             |
| `generated`  | `string` | found      | Path of the generated file, without the extension. Found in the source directory, the project root or `src/` |

It also accepts the `DialexConfig` fields. Run `dialex generate` first: the module reads the file it writes.

## Svelte

`dialexjs/svelte`

| Export                                  | Description                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `provideDialex(source?, options?)`      | Call once in the root component with `{ ...dialex }`. Returns `DialexSvelte`          |
| `useDialex()`                           | `{ locale, setLocale, store, dictionary, translator }` of the nearest `provideDialex` |
| `useDictionary(name)`                   | A store: `const home = useDictionary("home")`, then `$home.title`                     |
| `useT(...names)`                        | A store of `t`: `const t = useT("home")`, then `$t("home.title")`                     |
| `createSvelteDialex(source?, options?)` | The reactive core without component context, for plain modules and tests              |
| `preloadDictionaries`                   | See [below](#preloaddictionaries)                                                     |

`options` are the shared options (`defaultLocale`, `initialLocale`, `persist`, `storageKey`, `onLocaleChange`).

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

Call `createDialexQwik({ ...dialex })` once in a module of its own and import the hooks from there; the dictionaries then stay out of the serialized page. `DialexState` is `{ locale: string; loaded: number }`, plain data Qwik can resume. `persist` and `storageKey` are the shared options; reading the stored locale back is up to the server (`getPersistedLocale`).

## Lit

`dialexjs/lit`

| Export                   | Description                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options?)` | Creates the locale state: `{ locale, config, store, setLocale, subscribe, getDictionary, t }`. Create it once, in a module of its own                    |
| `DialexController`       | A reactive controller for any `ReactiveControllerHost`: `new DialexController(this, i18n)`. Has `locale`, `setLocale`, `dictionary(name)`, `t(...names)` |
| `preloadDictionaries`    | See [below](#preloaddictionaries)                                                                                                                        |

## `dialexjs/react-native`

| Export                                                                         | Description                                                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `DialexProvider`                                                               | Provider for React Native and Expo. See the props below                                      |
| `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries` | The hooks of `dialexjs/react`                                                                |
| `LocaleStorage`                                                                | `{ getItem(key), setItem(key, value) }`, sync or async: AsyncStorage, MMKV or `localStorage` |

| Prop                                               | Type                 | Description                                                                                                          |
| -------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `deviceLocales`                                    | `string \| string[]` | The device's languages, most preferred first (`expo-localization`'s `getLocales()`). The first supported one is used |
| `initialLocale`                                    | `string`             | Wins over `deviceLocales` and the stored locale                                                                      |
| `storage`                                          | `LocaleStorage`      | Where the choice is remembered. Children render once it has been read                                                |
| `storageKey`                                       | `string`             | Storage key. Default `"locale"`                                                                                      |
| `defaultLocale`, `onLocaleChange`, `{ ...dialex }` | —                    | As in the shared options                                                                                             |

## Angular

`dialexjs/angular`

| Export                     | Description                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(options)`   | Environment providers. `AngularDialexOptions`: `dictionaries` (required), `config`, `defaultLocale`, `locales`, `fallbacks`, `initialLocale` (a string, or a function that runs in the injection context), `persist`, `storageKey` |
| `injectDialex()`           | The `DialexStore`: `locale` (a signal), `setLocale`, `dictionary(name)`, `t`                                                                                                                                                       |
| `injectDictionary(name)`   | The dictionary as a signal                                                                                                                                                                                                         |
| `injectT()`                | The `t` function; it reads the locale signal on every call, so a template using it stays current                                                                                                                                   |
| `DIALEX`, `DIALEX_OPTIONS` | The injection tokens of the store and of the options                                                                                                                                                                               |

Call the `inject*` functions in an injection context.

## Next.js

| Export                                                         | Description                                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `createDialexMiddleware(options)` (`dialexjs/next/middleware`) | Keeps every page under a locale prefix. Returns `(request: NextRequest) => NextResponse`                            |
| `DialexLink` (`dialexjs/next/link`)                            | `next/link` that keeps the locale in the URL. Needs `DialexProvider` above it. Props: `next/link`'s, plus `locale?` |

`createDialexMiddleware` options: the [routing options](./routing.md) (`locales` required, `defaultLocale`, `prefixDefault`), the detection options `queryKeys`, `cookieKeys`, `headerKey`, `custom`, `fallbacks`, and:

| Option       | Type                            | Default                           | Description                                                        |
| ------------ | ------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `cookieName` | `string`                        | `"locale"`                        | Cookie that remembers the visitor's locale                         |
| `setCookie`  | `boolean`                       | `true`                            | Write the cookie when the URL's locale differs from the stored one |
| `ignore`     | `(pathname: string) => boolean` | `/_next`, `/api`, file extensions | Paths that skip locale handling                                    |

## Types

The option and prop types, and which entry point uses them:

| Type                                                                 | Used by                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `DialexProviderProps`                                                | `DialexProvider` of `dialexjs/react`, `preact`, `solid` and `react-native` |
| `DialexContext`                                                      | `useDialex()` of `dialexjs/react`, `preact`, `solid` and `vue`             |
| `CreateDialexOptions`                                                | `createDialex` of `dialexjs/vue` and `dialexjs/lit`                        |
| `Dialex`                                                             | The state `createDialex` of `dialexjs/lit` returns                         |
| `DialexOptions`, `DialexSvelte`                                      | `provideDialex` and `createSvelteDialex` of `dialexjs/svelte`              |
| `CreateDialexQwikOptions`, `UseDialexProviderOptions`, `DialexState` | `createDialexQwik` and its hooks, `dialexjs/qwik`                          |
| `AngularDialexOptions`, `DialexStore`                                | `provideDialex` and `injectDialex` of `dialexjs/angular`                   |
| `NuxtDialexOptions`                                                  | The module options of `dialexjs/nuxt`                                      |
| `DialexLinkProps`, `DialexMiddlewareOptions`                         | `DialexLink` and `createDialexMiddleware` of Next.js                       |
| `LocaleStorage`                                                      | The `storage` prop of `dialexjs/react-native`                              |

## `preloadDictionaries`

```ts
function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void>;
```

Starts loading lazy dictionaries; it does nothing when they are not lazy. In `lazy: "locale"` mode it loads the default locale unless you pass `{ locale }` first.

```ts
await preloadDictionaries(dialex, { locale: "tr" }, "checkout", "cart");
```
