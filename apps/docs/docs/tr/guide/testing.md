# Test Etme

`dialexjs/testing`, Dialex kullanan kodu çalışan bir sunucu, yapılandırma dosyası ya da paketleyici eklentisi olmadan test etmenize yardımcı olur. Her test çalıştırıcısıyla çalışır.

## `createTestDialex`

Uygulamanızın kullandığı `getDictionary` ve `t` ile aynı olan, kendi içinde bütünlüklü bir bağlam:

```ts
import { createTestDialex } from "dialexjs/testing";
import home from "../src/home.content";

const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });

dialex.getDictionary("home").title; // "Hoş Geldiniz"
dialex.t("home.greeting", "Ada"); // "Merhaba, Ada!"
dialex.withLocale("en").getDictionary("home").title; // "Welcome"
```

| Seçenek         | Varsayılan      | Açıklama                                                                        |
| --------------- | --------------- | ------------------------------------------------------------------------------- |
| `dictionaries`  | zorunlu         | `defineDictionary` sonuçları ya da bir `{ name: { locale: content } }` haritası |
| `locale`        | `defaultLocale` | Etkin yerel ayar                                                                |
| `defaultLocale` | `"en"`          | Son yedek                                                                       |
| `fallbacks`     |                 | Açık [yedek zincirleri](./fallbacks.md)                                         |

`withLocale(locale)` yeni bir bağlam döndürür; özgün bağlam değişmez. [Yedekler](./fallbacks.md) ve alt etiket kısaltma, uygulamadaki gibi davranır.

## `mockRequest`

Bir adaptörün istediğiniz yerel ayara çözdüğü standart bir `Request` oluşturur. Sunucuları, loader'ları ve middleware'leri test etmek için kullanın:

```ts
import { mockRequest } from "dialexjs/testing";

const res = await app.request(mockRequest("/dashboard", { locale: "tr" }));
expect(res.headers.get("content-language")).toBe("tr");
```

| Seçenek              | Varsayılan | Açıklama                                                                                                       |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `locale`             |            | İsteğin çözülmesi gereken yerel ayar                                                                           |
| `via`                | `"header"` | Nasıl iletildiği: `"header"` (`Accept-Language`), `"cookie"`, `"query"` (`?locale=`) veya `"path"` (`/tr/...`) |
| `headers`, `cookies` |            | Ek başlıklar ve çerezler                                                                                       |
| `method`, `body`     | `GET`      | İstek yöntemi ve gövdesi                                                                                       |

Göreli URL'ler `http://localhost` temel alınarak çözülür. Düz bir `Request` döndürür; bu yüzden `app.request()` (Hono, Elysia'nın `app.handle`), `fetch` işleyicileri, Next.js middleware'i (`new NextRequest(mockRequest(...))`) ve [Fetch API işleyicisi](../frameworks/web.md) ile çalışır.

## Bileşen testleri

`useDictionary`, `useT` veya `useDialex` çağıran bileşenler eklentinin sanal modüllerini okur; bu yüzden test çalıştırıcınızın Dialex Vite eklentisine ihtiyacı vardır. Vitest `vite.config.ts` dosyanızı kullandığından, eklenti zaten orada ise başka bir şey gerekmez.

### React

```tsx
import { render, screen } from "@testing-library/react";
import { TestDialexProvider } from "dialexjs/testing/react";

render(
  <TestDialexProvider locale="tr">
    <Header />
  </TestDialexProvider>,
);
expect(screen.getByRole("heading")).toHaveTextContent("Hoş Geldiniz");
```

`TestDialexProvider`, `locale` değerini hemen render eder ve çerezleri ya da `localStorage`'ı asla okumaz veya yazmaz; böylece testler birbirine durum sızdıramaz.

### Vue

```ts
import { mount } from "@vue/test-utils";
import { createTestDialex } from "dialexjs/testing/vue";

const wrapper = mount(Header, { global: { plugins: [createTestDialex("tr")] } });
```

::: tip Vite eklentisi olmadan
Eklentiyi test yapılandırmanıza ekleyemiyorsanız, onun yerine iki sanal modülü taklit edin (`vi.mock("virtual:dialex-dictionaries", ...)` ve `vi.mock("virtual:dialex-config", ...)`). Dialex'in kendi test paketi de bunu yapar.
:::
