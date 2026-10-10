# Astro

```ts
// src/middleware.ts
import { dialexAstro } from "dialexjs/astro";

import { dialex } from "./dialex.generated.js";

export const onRequest = dialexAstro({ ...dialex });
```

Diğer middleware'lerle birleştirmek için `astro:middleware` içindeki `sequence` işlevini kullanın.

Sayfalarda ve bileşenlerde yerel ayar ve sözlük erişimcisi `Astro.locals` üzerindedir ve bir `App.Locals` genişletmesi aracılığıyla tiplenir:

```astro
---
const dict = Astro.locals.getDictionary("home");
---

<html lang={Astro.locals.locale}>
  <h1>{dict.title}</h1>
</html>
```

Middleware istek URL'sini, başlıkları ve çerezleri okur; bu yüzden isteğe bağlı (SSR) rotalar için geçerlidir. Statik olarak önceden render edilen sayfaların derleme sırasında inceleyecek bir isteği yoktur. `setHeader` `false` olmadıkça `Content-Language` ayarlanır. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir ve `custom`, Astro bağlamını alır.

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- Ara katmanı `src/middleware.ts` içinde tutun ve yerel ayarı sayfalarda, düzenlerde ve uç noktalarda `Astro.locals` üzerinden okuyun; sayfa başına yeniden çözmeyin.
- Düzeninizde `<html lang={Astro.locals.locale}>` ayarlayın ve birden fazla dilde bulunan sayfalar için [yönlendirme yardımcılarıyla](../guide/routing.md) `hreflang` bağlantıları ekleyin.

## Sorun giderme

- **`Astro.locals.getDictionary` is not a function**: Astro yalnızca `src/middleware.ts` (veya `src/middleware/index.ts`) dosyasını yükler. `onRequest` değerini oradan dışa aktarın.
- **Statik sayfalar her zaman tek dilde**: ön oluşturmada istek yoktur. Dil başına rotalar (`/en/...`, `/tr/...`) oluşturun veya sunucu çıktısı kullanın.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
