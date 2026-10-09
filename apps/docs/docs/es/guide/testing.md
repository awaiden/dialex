# Pruebas

`dialexjs/testing` te ayuda a probar código que usa Dialex sin un servidor en ejecución, sin archivo de configuración y sin el plugin del bundler. Funciona con cualquier ejecutor de pruebas.

## `createTestDialex`

Un contexto autocontenido con los mismos `getDictionary` y `t` que usa tu aplicación:

```ts
import { createTestDialex } from "dialexjs/testing";
import home from "../src/home.content";

const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });

dialex.getDictionary("home").title; // "Hoş Geldiniz"
dialex.t("home.greeting", "Ada"); // "Merhaba, Ada!"
dialex.withLocale("en").getDictionary("home").title; // "Welcome"
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
import { mockRequest } from "dialexjs/testing";

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

Los componentes que llaman a `useDictionary`, `useT` o `useDialex` necesitan los diccionarios de un provider. Pasa el export `dialex` generado (o tus propios `dictionaries`) a los helpers de prueba de abajo; no hacen falta plugins del bundler ni mocks.

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

`TestDialexProvider` renderiza `locale` de inmediato y nunca lee ni escribe cookies ni `localStorage`, de modo que las pruebas no pueden filtrarse estado entre sí.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestDialex } from "dialexjs/testing/vue";
import { dialex } from "../dialex.generated";

const wrapper = mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
