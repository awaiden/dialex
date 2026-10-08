# Fetch API (Request)

`dialexjs/web`, yerel ayarı standart bir `Request` üzerinden çözer. Size bir `Request` veren her çerçevede ya da çalışma zamanında kullanın: React Router ve Remix loader'ları, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createI18nHandler } from "dialexjs/web";
import dictionaries from "./i18n.generated.js";

export const resolveI18n = createI18nHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveI18n(request);
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
  const { locale, getDictionary } = await resolveI18n(request);
  return { locale, title: getDictionary("home").title };
}
```

Veriyi bileşeninize döndürün ve orada render edin. Yanıtı kendiniz oluşturuyorsanız `applyHeaders` ile sarın.

### TanStack Start ve SolidStart

Geçerli isteği çerçevenizin sunucu yardımcısıyla okuyun, ardından `resolveI18n` işlevine verin. Örneğin SolidStart'ta `getRequestEvent()?.request` etkin `Request` değerini döndürür. Çağrı bir sunucu bağlamı gerektirdiğinden, onu istemci kodunda değil, sunucu fonksiyonlarında veya middleware'de kullanın.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const i18n = await resolveI18n(request);
    return i18n.applyHeaders(new Response(i18n.getDictionary("home").title));
  },
};
```
