# Testing

`dialexjs/testing` helps you test code that uses Dialex without a running server, a config file, or the bundler plugin. It works with any test runner.

## `createTestI18n`

A self-contained context with the same `getDictionary` and `t` your app uses:

```ts
import { createTestI18n } from "dialexjs/testing";
import home from "../src/home.content";

const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });

i18n.getDictionary("home").title; // "Hoş Geldiniz"
i18n.t("home.greeting", "Ada"); // "Merhaba, Ada!"
i18n.withLocale("en").getDictionary("home").title; // "Welcome"
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

Components that call `useDictionary`, `useT` or `useI18n` read the plugin's virtual modules, so your test runner needs the Dialex Vite plugin. Vitest uses your `vite.config.ts`, so if the plugin is already there nothing else is needed.

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestI18nProvider } from "dialexjs/testing/react";

render(
  <TestI18nProvider locale="tr">
    <Header />
  </TestI18nProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestI18nProvider` renders `locale` immediately and never reads or writes cookies or `localStorage`, so tests cannot leak state into each other.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestI18n } from "dialexjs/testing/vue";

const wrapper = mount(Header, { global: { plugins: [createTestI18n("tr")] } });
```

::: tip Without the Vite plugin
If you cannot add the plugin to your test config, mock the two virtual modules instead (`vi.mock("virtual:dialex-dictionaries", ...)` and `vi.mock("virtual:dialex-config", ...)`). Dialex's own test suite does this.
:::
