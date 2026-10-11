# AdonisJS

`dialexjs/adonis`, AdonisJS 6 ve sonrası için bir ara katman (middleware) sınıfı üretir. Onu bir middleware dosyasında oluştur:

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "../dialex.generated.js";

export default createDialexMiddleware({ ...dialex });
```

Her rotada çalışması için router middleware'i olarak kaydet:

```ts
// start/kernel.ts
import router from "@adonisjs/core/services/router";

router.use([() => import("#middleware/dialex_middleware")]);
```

İşleyiciler (handler) daha sonra `ctx.locale` ve `ctx.getDictionary(name)` değerlerini okur:

```ts
// start/routes.ts
import router from "@adonisjs/core/services/router";

router.get("/:locale", ({ locale, getDictionary }) => {
  const dict = getDictionary("home");
  return { title: dict.title, locale };
});
```

Middleware ayrıca `Content-Language` yanıt başlığını ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` nesnesini `createDialexMiddleware`'e ver. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Onu tek bir rotaya değil `router.use` ile kaydet; böylece her rota yerel ayarı ve `Content-Language` başlığını görür.
- İşleyicilerde `locale` ve `getDictionary` değerlerini bağlamdan (context) ayrıştır; ikisi de istek boyunca ayarlıdır.

## Sorun giderme

- **`ctx.getDictionary is not a function`**: middleware kayıtlı değil ya da ait olduğu rota tarafından kapsanmıyor. `start/kernel.ts` içinde `router.use` ile ekle.
- **`ctx.locale` üzerinde tür hatası**: `dialexjs/adonis` bildirimleri projenin parçası değil. `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
