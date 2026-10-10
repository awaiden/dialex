# Express

```ts
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

Middleware `req.locale` ve `req.getDictionary(name)` ekler (ayrıca `res.locals` üzerine de). `cookie-parser` kuruluysa çerezler `req.cookies` içinden, aksi halde `Cookie` başlığından okunur. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Adaptörü rotalarınızdan önce kaydedin; böylece her işleyici yerel ayarı ve `getDictionary` işlevini görür.
- Yanıtların `Content-Language` taşıması için `setHeader` değerini açık tutun ve bir CDN veya vekil bu başlığa bağlı sayfaları önbelleğe alıyorsa `Vary: Accept-Language` ekleyin.
- `cookie-parser` isteğe bağlıdır: olmadan Dialex `Cookie` başlığını kendisi okur; yani yalnızca yerel ayar algılama için kurmanız gerekmez.

## Sorun giderme

- **`req.getDictionary is not a function`**: ara katman rotadan sonra kaydedilmiş veya hiç kaydedilmemiş. `app.use(dialexExpress({ ...dialex }))` ilk sırada olmalıdır.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
