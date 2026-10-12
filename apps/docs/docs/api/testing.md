# Testing

Helpers for unit and component tests. They need no bundler plugin, config file or generated file, and they never touch cookies or `localStorage`, so tests cannot leak state into each other. See [Testing](../guide/testing.md) for worked examples.

## `dialexjs/testing`

### `createTestDialex(options)`

```ts
function createTestDialex(options: TestDialexOptions): TestDialex;
```

| Option          | Type                       | Default         | Description                                                                    |
| --------------- | -------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `dictionaries`  | `DictionaryInput`          | —               | `defineDictionary` results, or a `{ name: { locale: content } }` map. Required |
| `locale`        | `string`                   | `defaultLocale` | The active locale                                                              |
| `defaultLocale` | `string`                   | `"en"`          | Fallback locale                                                                |
| `fallbacks`     | `Record<string, string[]>` | —               | Explicit [fallback chains](../guide/fallbacks.md)                              |

Returns a `TestDialex`:

| Member                | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `locale`              | The active locale                                                 |
| `getDictionary(name)` | The content of a dictionary for the active locale, with fallbacks |
| `t`                   | A [`t` function](./core.md#createt) for the active locale         |
| `withLocale(locale)`  | A new context over the same dictionaries under another locale     |

```ts
const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
```

### `mockRequest(url, options?)`

```ts
function mockRequest(url: string, options?: MockRequestOptions): Request;
```

Builds a standard `Request` that a server adapter resolves to `options.locale`. Relative URLs are resolved against `http://localhost`.

| Option    | Type                                        | Default    | Description                                                                                              |
| --------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `locale`  | `string`                                    | —          | The locale the request should resolve to                                                                 |
| `via`     | `"header" \| "cookie" \| "query" \| "path"` | `"header"` | How the locale is conveyed: `Accept-Language`, the `locale` cookie, `?locale=` or a leading path segment |
| `headers` | `Record<string, string>`                    | —          | More request headers                                                                                     |
| `cookies` | `Record<string, string>`                    | —          | More cookies                                                                                             |
| `method`  | `string`                                    | `"GET"`    | HTTP method                                                                                              |
| `body`    | `BodyInit \| null`                          | —          | Request body                                                                                             |

```ts
const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
```

## `dialexjs/testing/react`

### `TestDialexProvider`

```tsx
function TestDialexProvider(props: TestDialexProviderProps): ReactElement;
```

`DialexProvider` for component tests: it renders `locale` immediately and never reads or writes cookies or `localStorage`. Give it the generated `dialex` export, or your own `dictionaries`.

| Prop                                | Type           | Description                                                |
| ----------------------------------- | -------------- | ---------------------------------------------------------- |
| `locale`                            | `string`       | The locale to render with. Default: the configured default |
| `dictionaries`, `config`, `loaders` | `DialexSource` | What the provider reads                                    |
| `children`                          | `ReactNode`    | The component under test                                   |

```tsx
import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
```

## `dialexjs/testing/vue`

### `createTestDialex(locale?, source?)`

```ts
function createTestDialex(locale?: string, source?: DialexSource): VuePlugin;
```

A Vue plugin for component tests that starts in `locale` with no persistence. Pass the generated `dialex` export, or your own `dictionaries`, as `source`.

```ts
import { dialex } from "../dialex.generated";

mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
