# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { dialexHandle } from "dialexjs/sveltekit";

import { dialex } from "./dialex.generated.js";

export const handle = dialexHandle({ ...dialex });
```

Diğer hook'larla birleştirmek için `@sveltejs/kit/hooks` içindeki `sequence` işlevini kullanın.

## Locals

`dialexHandle`, `event.locals.locale` ve `event.locals.getDictionary(name)` değerlerini doldurur ve her ikisinin de tiplenmesi için `App.Locals` arayüzünü genişletir:

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

## En iyi uygulamalar

- Yerel ayarı sunucuda `dialexHandle` ile çözün ve kök `+layout.server.ts` dosyasından tarayıcıya aktarın. Bileşenlerde ilk istemci oluşturması HTML ile eşleşsin diye `initialLocale` ile [`dialexjs/svelte`](./svelte.md) kullanın.
- `dialexHandle` değerini `@sveltejs/kit/hooks` içindeki `sequence` ile diğer kancalarınızla birleştirin ve sonraki kancaların `event.locals.locale` okuyabilmesi için ilk sıraya koyun.
- `dialex.generated.ts` içindeki `{ ...dialex }` değerini adaptöre geçirin. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.

## Sorun giderme

- **`locals.getDictionary` is not a function**: `handle`, `src/hooks.server.ts` içinden dışa aktarılmamış veya `dialexHandle` onun parçası değil. `handle = dialexHandle({ ...dialex })` dışa aktarın.
- **`getDictionary` `any` döndürüyor**: tip kayıt defteri eksik. `dx generate` çalıştırın ve `dialex-env.d.ts` dosyasının `tsconfig` içine dahil olduğundan emin olun.
- **Hep varsayılan yerel ayar**: hiçbir kaynak isteğe uymadı. Sıra URL öneki (`/tr/...`), `?locale=` veya `?lang=`, `locale` çerezi ve ardından `Accept-Language` şeklindedir. İstemcinin gerçekte hangisini gönderdiğini kontrol edin.
