# Pruebas

`dialex/testing` te ayuda a probar código que usa Dialex sin un servidor en ejecución, sin archivo de configuración y sin el plugin del bundler. Funciona con cualquier ejecutor de pruebas.

## `createTestI18n`

Un contexto autocontenido con los mismos `getDictionary` y `t` que usa tu aplicación:

```ts
import { createTestI18n } from "dialex/testing";
import home from "../src/home.content";

const i18n = createTestI18n({ dictionaries: [home], locale: "tr" });

i18n.getDictionary("home").title; // "Hoş Geldiniz"
i18n.t("home.greeting", "Ada"); // "Merhaba, Ada!"
i18n.withLocale("en").getDictionary("home").title; // "Welcome"
```

| Opción          | Valor por defecto | Descripción                                                                 |
| --------------- | ----------------- | --------------------------------------------------------------------------- |
| `dictionaries`  | obligatorio       | Resultados de `defineDictionary`, o un mapa `{ name: { locale: content } }` |
| `locale`        | `defaultLocale`   | Locale activo                                                               |
| `defaultLocale` | `"en"`            | Fallback final                                                              |
| `fallbacks`     |                   | [Cadenas de fallback](./fallbacks.md) explícitas                            |

`withLocale(locale)` devuelve un contexto nuevo; el original no cambia. Los [fallbacks](./fallbacks.md) y el truncamiento de subetiquetas se comportan como en la aplicación.

## `mockRequest`

Crea una `Request` estándar que un adaptador resuelve al locale que pidas. Úsala para probar servidores, loaders y middleware:

```ts
import { mockRequest } from "dialex/testing";

const res = await app.request(mockRequest("/dashboard", { locale: "tr" }));
expect(res.headers.get("content-language")).toBe("tr");
```

| Opción               | Valor por defecto | Descripción                                                                                                  |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `locale`             |                   | Locale al que debe resolverse la petición                                                                    |
| `via`                | `"header"`        | Cómo se transmite: `"header"` (`Accept-Language`), `"cookie"`, `"query"` (`?locale=`) o `"path"` (`/tr/...`) |
| `headers`, `cookies` |                   | Cabeceras y cookies adicionales                                                                              |
| `method`, `body`     | `GET`             | Método y cuerpo de la petición                                                                               |

Las URL relativas se resuelven respecto a `http://localhost`. Devuelve una `Request` normal, así que funciona con `app.request()` (Hono, `app.handle` de Elysia), con manejadores `fetch`, con el middleware de Next.js (`new NextRequest(mockRequest(...))`) y con el [manejador de la Fetch API](../frameworks/web.md).

## Pruebas de componentes

Los componentes que llaman a `useDictionary`, `useT` o `useI18n` leen los módulos virtuales del plugin, así que tu ejecutor de pruebas necesita el plugin de Vite de Dialex. Vitest usa tu `vite.config.ts`, así que si el plugin ya está ahí no hace falta nada más.

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

`TestI18nProvider` renderiza `locale` de inmediato y nunca lee ni escribe cookies ni `localStorage`, de modo que las pruebas no pueden filtrarse estado entre sí.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestI18n } from "dialex/testing/vue";

const wrapper = mount(Header, { global: { plugins: [createTestI18n("tr")] } });
```

::: tip Sin el plugin de Vite
Si no puedes añadir el plugin a la configuración de pruebas, simula en su lugar los dos módulos virtuales (`vi.mock("virtual:dialex-dictionaries", ...)` y `vi.mock("virtual:dialex-config", ...)`). La propia suite de pruebas de Dialex lo hace.
:::
