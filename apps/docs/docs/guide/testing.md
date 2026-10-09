# Testing

`dialexjs/testing` helps you test code that uses Dialex without a running server, a config file, or the bundler plugin. It works with any test runner.

## `createTestDialex`

A self-contained context with the same `getDictionary` and `t` your app uses:

```ts
import { createTestDialex } from "dialexjs/testing";

import home from "../src/home.content";

const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });

dialex.getDictionary("home").title; // "Hoş Geldiniz"
dialex.t("home.greeting", "Ada"); // "Merhaba, Ada!"
dialex.withLocale("en").getDictionary("home").title; // "Welcome"
```

| Option          | Default         | Description                                                          |
| --------------- | --------------- | -------------------------------------------------------------------- |
| `dictionaries`  | required        | `defineDictionary` results, or a `{ name: { locale: content } }` map |
| `locale`        | `defaultLocale` | Active locale                                                        |
| `defaultLocale` | `"en"`          | Final fallback                                                       |
| `fallbacks`     |                 | Explicit [fallback chains](./fallbacks.md)                           |

`withLocale(locale)` returns a new context; the original is not changed. [Fallbacks](./fallbacks.md) and subtag truncation behave as in the app.

## `mockRequest`

Builds a standard `Request` that an adapter resolves to the locale you ask for. Use it to test servers, loaders and middleware:

```ts
import { mockRequest } from "dialexjs/testing";

const res = await app.request(mockRequest("/dashboard", { locale: "tr" }));
expect(res.headers.get("content-language")).toBe("tr");
```

| Option               | Default    | Description                                                                                                    |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `locale`             |            | Locale the request should resolve to                                                                           |
| `via`                | `"header"` | How it is conveyed: `"header"` (`Accept-Language`), `"cookie"`, `"query"` (`?locale=`) or `"path"` (`/tr/...`) |
| `headers`, `cookies` |            | Extra headers and cookies                                                                                      |
| `method`, `body`     | `GET`      | Request method and body                                                                                        |

Relative URLs resolve against `http://localhost`. It returns a plain `Request`, so it works with `app.request()` (Hono, Elysia's `app.handle`), `fetch` handlers, Next.js middleware (`new NextRequest(mockRequest(...))`), and the [Fetch API handler](../frameworks/web.md).

## Component tests

Components that call `useDictionary`, `useT` or `useDialex` need dictionaries from a provider. Pass the generated `dialex` export (or your own `dictionaries`) to the test helpers below; no bundler plugin or mocks are needed.

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestDialexProvider } from "dialexjs/testing/react";

import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestDialexProvider` renders `locale` immediately and never reads or writes cookies or `localStorage`, so tests cannot leak state into each other.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestDialex } from "dialexjs/testing/vue";

import { dialex } from "../dialex.generated";

const wrapper = mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
