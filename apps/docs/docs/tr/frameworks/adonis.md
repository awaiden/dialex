# AdonisJS

`dialexjs/adonis`, AdonisJS 6 ve sonrası için bir ara katman (middleware) sınıfı üretir. Onu bir middleware dosyasında oluştur:

```ts
// app/middleware/dialex_middleware.ts
import { createDialexMiddleware } from "dialexjs/adonis";

import { dialex } from "#start/dialex.generated";

export default createDialexMiddleware({ ...dialex });
```

Yukarıdaki içe aktarma, üretilen dosyayı `start/` içinden okur. Dosyanın oraya yazılması için `dialex.config.ts` içinde `output` ayarla (`dialex init` bunu AdonisJS için yapar):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "start/dialex.generated.ts",
});
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

## Kurulum

Zaten kullandığınız framework paketini Dialex ile birlikte kurun, sonra sözlükleri derleyin:

```bash
npm install dialexjs @adonisjs/core
npm install -D @dialexjs/cli
npx dialex generate
```

## Seçenekler

Adaptör [yerel ayar algılama seçeneklerini](../guide/locale-detection.md), `dictionaries` ve `setHeader` değerlerini alır. Her seçenek, adaptör adaptör, [Sunucu adaptörleri](../api/server-adapters.md) sayfasındadır.

## TypeScript

`dialex generate` `dialex-env.d.ts` dosyasını yazar. Bu dosya `tsconfig.json` içine dahil edildiğinde (ve `moduleResolution` `"bundler"` ya da `"nodenext"` olduğunda), `ctx.getDictionary("home")` sözlük adlarını otomatik tamamlar, içeriği tipler ve `locale`, yapılandırılmış yerel ayarlarınızın birleşimi olur.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` nesnesini `createDialexMiddleware`'e ver. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Onu tek bir rotaya değil `router.use` ile kaydet; böylece her rota yerel ayarı ve `Content-Language` başlığını görür.
- İşleyicilerde `locale` ve `getDictionary` değerlerini bağlamdan (context) ayrıştır; ikisi de istek boyunca ayarlıdır.

## Sorun giderme

- **`ctx.getDictionary is not a function`**: middleware kayıtlı değil ya da ait olduğu rota tarafından kapsanmıyor. `start/kernel.ts` içinde `router.use` ile ekle.
- **`ctx.locale` üzerinde tür hatası**: `dialexjs/adonis` bildirimleri projenin parçası değil. `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
