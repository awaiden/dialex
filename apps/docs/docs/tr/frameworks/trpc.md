# tRPC

`dialexjs/trpc`, yerel ayarı ve sözlükleri tRPC bağlamına (context) koyar; böylece her prosedür kendi hatalarını ve mesajlarını çevirebilir. `@trpc/server`'a bağımlılığı yoktur; adaptörünün zaten `createContext`'e verdiği isteği okur. Başlık, çerez ve sorgu dizesi algılaması her adaptörle çalışır; Express ve standalone adaptörlerinde `req.url` bağlama yoluna göredir, bu yüzden URL yolundaki yerel ayar öneki yalnızca tam URL `url` içinde verildiğinde görülür.

```ts
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { title: dict.title, locale: ctx.locale };
  }),
});
```

`resolveDialex(request)` `{ locale, getDictionary, t }` döndürür. Oturumun veya veritabanı tanıtıcısının yanında kendi bağlamına yay (spread).

## İstek biçimleri

Argüman bir Fetch `Request` olabilir (fetch, Next.js ve Cloudflare adaptörleri bunu verir) ya da `headers` ve isteğe bağlı `url` içeren herhangi bir nesne olabilir (Express ve standalone adaptörleri bunu verir):

```ts
// Express adapter
createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ ...resolveDialex(req) }),
});
```

## En iyi uygulamalar

- `dialex.generated.ts` içindeki `{ ...dialex }` nesnesini `createDialexContext`'e ver. Sözlükleri ve yerel ayar yapılandırmasını taşır; böylece `defaultLocale`, `locales` ve `fallbacks` yalnızca bir kez, `dialex.config.ts` içinde yazılır.
- `resolveDialex`'i modül düzeyinde bir kez oluştur ve her istekte `createContext` içinde çağır.
- Bir `TRPCError` mesajını oluşturmak için `ctx.getDictionary("errors")` kullan; böylece istemciler kendi dillerinde metin alır.
- tRPC çağrıları çoğu zaman kendi ön yüzünden gelir. Yerel ayarı her prosedürün girdisi olarak değil, tarayıcının kendiliğinden gönderdiği `locale` çerezi ya da `Accept-Language` başlığı olarak gönder.

## Sorun giderme

- **Yerel ayar hep varsayılan**: Express adaptöründe `req.url` bağlama yoluna göredir, bu yüzden yoldaki yerel ayar öneki görülmez. Bunun yerine çerezi ya da `Accept-Language`'ı kullan veya özgün URL'yi `url` içinde ver.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
- **Bir prosedürde `ctx.getDictionary` yok**: `createContext`, `resolveDialex` sonucunu döndürmüyor. Döndürdüğün nesneye yay (spread).
