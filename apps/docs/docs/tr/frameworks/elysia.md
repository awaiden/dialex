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
