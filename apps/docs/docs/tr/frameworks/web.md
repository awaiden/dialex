# Fetch API (Request)

`dialexjs/web`, yerel ayarı standart bir `Request` üzerinden çözer. Size bir `Request` veren her çerçevede ya da çalışma zamanında kullanın: React Router ve Remix loader'ları, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createDialexHandler } from "dialexjs/web";

import dictionaries from "./dialex.generated.js";

export const resolveDialex = createDialexHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveDialex(request);
```

| Sonuç                    | Açıklama                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `locale`                 | Algılanan yerel ayar                                                                                      |
| `getDictionary(name)`    | O yerel ayar için sözlük içeriği, [yedekleri](../guide/fallbacks.md) izler                                |
| `t(path, ...args)`       | [Anahtar yolu çevirici](../guide/key-paths.md)                                                            |
| `headers`                | `{ "Content-Language": locale }` (`setHeader` `false` olduğunda boş)                                      |
| `applyHeaders(response)` | Yanıtı bu başlıklarla döndürür; başlıkları değiştirilemezse yanıtı kopyalar (örneğin `Response.redirect`) |

Algılama sırası ve seçenekler diğer adaptörlerle aynıdır: bkz. [Yerel Ayar Algılama](../guide/locale-detection.md).

## Tarifler

Bunlar parçaların nasıl bir araya geldiğini gösterir. Dialex'in testleri yalnızca `dialexjs/web`'in kendisini kapsar; aşağıdaki çerçeve bağlantıları gerçek uygulamalarda çalıştırılmamıştır, bu yüzden çerçevenizin güncel belgeleriyle karşılaştırın.

### React Router / Remix

Loader'lar `Request` alır:

```ts
export async function loader({ request }: { request: Request }) {
  const { locale, getDictionary } = await resolveDialex(request);
  return { locale, title: getDictionary("home").title };
}
```

Veriyi bileşeninize döndürün ve orada render edin. Yanıtı kendiniz oluşturuyorsanız `applyHeaders` ile sarın.

### TanStack Start ve SolidStart

Geçerli isteği çerçevenizin sunucu yardımcısıyla okuyun, ardından `resolveDialex` işlevine verin. Örneğin SolidStart'ta `getRequestEvent()?.request` etkin `Request` değerini döndürür. Çağrı bir sunucu bağlamı gerektirdiğinden, onu istemci kodunda değil, sunucu fonksiyonlarında veya middleware'de kullanın. TanStack Start'ta `getRequest()` işlevini `@tanstack/react-start/server` içinden bir `createServerFn` işleyicisinin içinde çağırın. [`examples/tanstack`](https://github.com/awaiden/dialex/tree/main/examples/tanstack) uygulaması bunu kök rotanın `beforeLoad` işlevinde yapar ve sonucu `DialexProvider`'a `initialLocale` olarak verir; buradaki diğer tariflerin aksine gerçek bir uygulamada çalışır.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const dialex = await resolveDialex(request);
    return dialex.applyHeaders(new Response(dialex.getDictionary("home").title));
  },
};
```
