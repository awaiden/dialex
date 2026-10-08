# Testen

`dialex/testing` hilft dir, Code zu testen, der Dialex verwendet, ohne laufenden Server, Konfigurationsdatei oder Bundler-Plugin. Es funktioniert mit jedem Test-Runner.

## `createTestI18n`

Ein in sich geschlossener Kontext mit denselben `getDictionary` und `t`, die deine App verwendet:

```ts
import { createTestI18n } from "dialex/testing";
import home from "../src/home.content";

const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });

i18n.getDictionary("home").title; // "Hoş Geldiniz"
i18n.t("home.greeting", "Ada"); // "Merhaba, Ada!"
i18n.withLocale("en").getDictionary("home").title; // "Welcome"
```

| Option          | Standard        | Beschreibung                                                                |
| --------------- | --------------- | --------------------------------------------------------------------------- |
| `dictionaries`  | erforderlich    | `defineDictionary`-Ergebnisse oder eine Map `{ name: { locale: content } }` |
| `locale`        | `defaultLocale` | Aktives Locale                                                              |
| `defaultLocale` | `"en"`          | Letzter Fallback                                                            |
| `fallbacks`     |                 | Explizite [Fallback-Ketten](./fallbacks.md)                                 |

`withLocale(locale)` liefert einen neuen Kontext; der ursprüngliche bleibt unverändert. [Fallbacks](./fallbacks.md) und das Kürzen von Subtags verhalten sich wie in der App.

## `mockRequest`

Erzeugt einen Standard-`Request`, den ein Adapter zum gewünschten Locale auflöst. Verwende ihn, um Server, Loader und Middleware zu testen:

```ts
import { mockRequest } from "dialex/testing";

const res = await app.request(mockRequest("/dashboard", { locale: "tr" }));
expect(res.headers.get("content-language")).toBe("tr");
```

| Option               | Standard   | Beschreibung                                                                                                          |
| -------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `locale`             |            | Locale, zu dem sich die Anfrage auflösen soll                                                                         |
| `via`                | `"header"` | Wie es übermittelt wird: `"header"` (`Accept-Language`), `"cookie"`, `"query"` (`?locale=`) oder `"path"` (`/tr/...`) |
| `headers`, `cookies` |            | Zusätzliche Header und Cookies                                                                                        |
| `method`, `body`     | `GET`      | HTTP-Methode und Body der Anfrage                                                                                     |

Relative URLs werden gegen `http://localhost` aufgelöst. Er liefert einen einfachen `Request`, funktioniert also mit `app.request()` (Hono, `app.handle` von Elysia), `fetch`-Handlern, Next.js-Middleware (`new NextRequest(mockRequest(...))`) und dem [Fetch-API-Handler](../frameworks/web.md).

## Komponententests

Komponenten, die `useDictionary`, `useT` oder `useI18n` aufrufen, lesen die virtuellen Module des Plugins, daher braucht dein Test-Runner das Dialex-Vite-Plugin. Vitest verwendet deine `vite.config.ts`; ist das Plugin dort bereits eingetragen, ist nichts weiter nötig.

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestI18nProvider } from "dialex/testing/react";

render(
  <TestI18nProvider locale="tr">
    <Header />
  </TestI18nProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestI18nProvider` rendert `locale` sofort und liest oder schreibt niemals Cookies oder `localStorage`, sodass Tests keinen Zustand aneinander weitergeben können.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestI18n } from "dialex/testing/vue";

const wrapper = mount(Header, { global: { plugins: [createTestI18n("tr")] } });
```

::: tip Ohne das Vite-Plugin
Kannst du das Plugin nicht zu deiner Test-Konfiguration hinzufügen, mocke stattdessen die beiden virtuellen Module (`vi.mock("virtual:dialex-dictionaries", ...)` und `vi.mock("virtual:dialex-config", ...)`). Die eigene Testsuite von Dialex macht das so.
:::
