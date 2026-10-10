# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin`, `fastify-plugin` ile sarılmıştır (ad `dialex-fastify`, Fastify `>=4`); bu yüzden istek dekoratörleri kapsülleme bağlamları arasında görünür. Aynı zamanda varsayılan dışa aktarımdır. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Eklentiyi kök örnekte, rotalarınızdan ve diğer eklentilerden önce bir kez kaydedin; böylece `req.locale` ve `req.getDictionary` her yerde bulunur.
- `Accept-Language` veya çerezleri kendiniz ayrıştırmak yerine adaptörün çözdüğü yerel ayarı okuyun; böylece her rota ara katmanla uyumlu olur.

## Sorun giderme

- **`req.getDictionary` bir rotada tanımsız**: rota eklentiden önce kaydedilmiş. `await app.register(dialexPlugin, { ...dialex })` önce tamamlanmalıdır.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
