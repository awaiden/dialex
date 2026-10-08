# Elysia

```ts
import { Elysia } from "elysia";
import { i18n } from "dialexjs/elysia";
import dictionaries from "./src/i18n.generated.js";

const app = new Elysia()
  .use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }))
  .get("/:locale", ({ locale, getDictionary }) => {
    const dict = getDictionary("home");
    return { title: dict.title, locale };
  })
  .listen(3000);
```

Eklenti genel olarak kaydedilir ve istek bağlamında iki değer türetir: `locale` ve `getDictionary(name)`. `setHeader` `false` olmadıkça yanıtta `Content-Language` başlığını ayarlar. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir ve `custom`, Elysia bağlamını alır.
