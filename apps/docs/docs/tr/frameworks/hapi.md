# Hapi

```ts
import Hapi from "@hapi/hapi";
import { dialexPlugin } from "dialexjs/hapi";

import { dialex } from "./src/dialex.generated.js";

const server = Hapi.server({ port: 3000 });

await server.register({ plugin: dialexPlugin, options: { ...dialex } });

server.route({
  method: "GET",
  path: "/{locale}",
  handler: (request) => {
    const dict = request.getDictionary("home");
    return { title: dict.title, locale: request.locale };
  },
});

await server.start();
```

`dialexPlugin`'i rotalarından önce kaydet. Her isteğe `request.locale` ve `request.getDictionary(name)` ekler ve hata yanıtları dahil `Content-Language` yanıt başlığını ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## Kurulum

Zaten kullandığınız framework paketini Dialex ile birlikte kurun, sonra sözlükleri derleyin:

```bash
npm install dialexjs @hapi/hapi
npm install -D @dialexjs/cli
npx dialex generate
```

## Seçenekler

Adaptör [yerel ayar algılama seçeneklerini](../guide/locale-detection.md), `dictionaries` ve `setHeader` değerlerini alır. Her seçenek, adaptör adaptör, [Sunucu adaptörleri](../api/server-adapters.md) sayfasındadır.

## TypeScript

`dialex generate` `dialex-env.d.ts` dosyasını yazar. Bu dosya `tsconfig.json` içine dahil edildiğinde (ve `moduleResolution` `"bundler"` ya da `"nodenext"` olduğunda), `request.getDictionary("home")` sözlük adlarını otomatik tamamlar, içeriği tipler ve `locale`, yapılandırılmış yerel ayarlarınızın birleşimi olur.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` nesnesini eklenti seçenekleri olarak ver. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Eklentiyi, yerel ayarı okuyan rotalardan önce kaydet. Yerel ayar `onRequest` genişletme noktasında çözülür; bu yüzden kimlik doğrulama ve doğrulama dahil yaşam döngüsünün sonraki her adımında kullanılabilir.
- Gönderdiğin her metnin, `Boom` hata mesajları dahil, dilini seçmek için `request.locale` kullan; böylece sayfanın geri kalanıyla uyumlu olur.

## Sorun giderme

- **`request.getDictionary is not a function`**: eklenti, rotanın ait olduğu sunucuda kayıtlı değil. Kök sunucuya ya da rotayı tanımlayan eklentiye kaydet.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
