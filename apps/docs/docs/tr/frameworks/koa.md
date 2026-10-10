# Koa

```ts
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

`dialexKoa()` işlevini rotalarınızdan önce kaydedin. `ctx.locale` ve `ctx.getDictionary(name)` ekler. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Adaptörü rotalarınızdan önce kaydedin; böylece her işleyici yerel ayarı ve `getDictionary` işlevini görür.
- Gönderdiğiniz her metnin dilini seçmek için `ctx.locale` kullanın; hata yanıtları dahil, böylece sayfanın geri kalanıyla uyumlu olur.

## Sorun giderme

- **`ctx.getDictionary is not a function`**: `dialexKoa()` yönlendiriciden sonra kaydedilmiş. `app.use` ile `router.routes()` öncesinde ekleyin.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
