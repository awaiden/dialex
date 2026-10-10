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
