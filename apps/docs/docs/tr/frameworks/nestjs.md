# NestJS

## Modül

```ts
import { Module } from "@nestjs/common";
import { DialexModule } from "dialexjs/nestjs";

import { dialex } from "./dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` ayrıca `isGlobal` seçeneğini de kabul eder (varsayılan `true`). Asenkron yapılandırma için:

```ts
DialexModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...dialex,
    defaultLocale: config.get("DEFAULT_LOCALE"),
  }),
});
```

## Controller'lar

```ts
import { Controller, Get } from "@nestjs/common";
import { DialexLocale, DialexDictionary } from "dialexjs/nestjs";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@DialexLocale() locale: string, @DialexDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}
```

## Dışa aktarımlar

| Dışa aktarım                            | Açıklama                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot / forRootAsync`   | Dinamik modül kaydı                                                                                 |
| `DialexService`                         | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `DialexInterceptor`, `DialexMiddleware` | `req.locale` ve `req.getDictionary` değerlerini ekler                                               |
| `@DialexLocale()`                       | Çözülen yerel ayar için parametre dekoratörü                                                        |
| `@DialexDictionary(name)`               | Bir sözlük için parametre dekoratörü                                                                |
| `DIALEX_OPTIONS`                        | Modül seçenekleri için enjeksiyon belirteci                                                         |

`DialexLocale` ve `DialexDictionary`, interceptor'ın veya middleware'in isteğe eklediği değerleri okur; bu yüzden bunlardan birinin uygulandığından emin olun. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.

## En iyi uygulamalar

- `DialexModule.forRoot({ ...dialex })` değerini kök modülde bir kez içe aktarın. Varsayılan olarak globaldir; özellik modülleri onu yeniden içe aktarmaz.
- `req` okumak yerine yerel ayarı ve sözlükleri `@DialexLocale()` ve `@DialexDictionary("home")` ile parametre olarak alın; bu denetleyicileri test etmeyi kolaylaştırır.
- `DialexInterceptor` değerini tüm uygulama için `APP_INTERCEPTOR` ile kaydedin veya guard'lardan önce yerel ayara ihtiyaç duyduğunuzda `configure()` içinde `DialexMiddleware` uygulayın.

## Sorun giderme

- **`Nest can't resolve dependencies of ... (DialexService)`**: `DialexModule.forRoot(...)` modül grafında içe aktarılmamış veya `isGlobal` kapatılmış.
- **`req.getDictionary` tanımsız**: ne `DialexInterceptor` ne de `DialexMiddleware` kayıtlı. Dekoratörler ve `DialexService` bunlarsız çalışır, istek özellikleri çalışmaz.
- **`[dialex] Dictionary "x" not found`**: sözlük `dialex.generated.ts` içinde değil. `dx generate` çalıştırın ve `dialex.config.ts` içindeki `include` değerinin dosyayla eşleştiğini kontrol edin.
