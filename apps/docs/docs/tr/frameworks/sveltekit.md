# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { i18nHandle } from "dialexjs/sveltekit";
import dictionaries from "./dialex.generated.js";

export const handle = i18nHandle({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

Diğer hook'larla birleştirmek için `@sveltejs/kit/hooks` içindeki `sequence` işlevini kullanın.

## Locals

`i18nHandle`, `event.locals.locale` ve `event.locals.getDictionary(name)` değerlerini doldurur ve her ikisinin de tiplenmesi için `App.Locals` arayüzünü genişletir:

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## Belge dili

Yer tutucuyu `src/app.html` içine koyun; her yanıtta çözülen yerel ayarla değiştirilir:

```html
<html lang="%dialex.lang%"></html>
```

`setHeader` `false` olmadıkça `Content-Language` ayarlanır. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir ve `custom`, istek olayını (request event) alır.
