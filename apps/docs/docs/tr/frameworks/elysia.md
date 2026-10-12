# Elysia

```ts
import { dialexElysia } from "dialexjs/elysia";
import { Elysia } from "elysia";

import { dialex } from "./src/dialex.generated.js";

const app = new Elysia()
  .use(dialexElysia({ ...dialex }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

Eklenti genel olarak kaydedilir ve istek bağlamında iki değer türetir: `locale` ve `getDictionary(name)`. `setHeader` `false` olmadıkça yanıtta `Content-Language` başlığını ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir ve `custom`, Elysia bağlamını alır.

## Kurulum

Zaten kullandığınız framework paketini Dialex ile birlikte kurun, sonra sözlükleri derleyin:

```bash
npm install dialexjs elysia
npm install -D @dialexjs/cli
npx dialex generate
```

## Seçenekler

Adaptör [yerel ayar algılama seçeneklerini](../guide/locale-detection.md), `dictionaries` ve `setHeader` değerlerini alır. Her seçenek, adaptör adaptör, [Sunucu adaptörleri](../api/server-adapters.md) sayfasındadır.

## TypeScript

`dialex generate` `dialex-env.d.ts` dosyasını yazar. Bu dosya `tsconfig.json` içine dahil edildiğinde (ve `moduleResolution` `"bundler"` ya da `"nodenext"` olduğunda), `getDictionary("home")` sözlük adlarını otomatik tamamlar, içeriği tipler ve `locale`, yapılandırılmış yerel ayarlarınızın birleşimi olur.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Eklentiyi `locale` okuyan rotalardan önce `.use()` ile ekleyin; Elysia eklentileri eklenme sırasına göre uygular.
- Yanıtların `Content-Language` taşıması için `setHeader` değerini açık tutun ve bir CDN veya vekil bu başlığa bağlı sayfaları önbelleğe alıyorsa `Vary: Accept-Language` ekleyin.

## Sorun giderme

- **`locale` bir işleyicide tanımsız**: eklenti rotadan sonra eklenmiş. Önce `.use(dialexElysia({ ...dialex }))` zincirleyin.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
