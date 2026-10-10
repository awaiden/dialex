# Hono

```ts
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

Middleware, `locale` ve `getDictionary` değerlerini `c.var` üzerinden okunan bağlam değişkenleri olarak ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Adaptörü rotalarınızdan önce kaydedin; böylece her işleyici yerel ayarı ve `getDictionary` işlevini görür.
- Adaptör yalnızca isteği ve geçirdiğiniz sözlükleri okur; bu yüzden Hono'nun desteklediği her çalışma zamanında (Node, Bun, Deno, Workers) çalışır.

## Sorun giderme

- **`c.var.getDictionary` tanımsız**: ara katman rotayı kapsamıyor. Rotalardan önce `app.use("*", dialexHono({ ...dialex }))` ile kaydedin.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
