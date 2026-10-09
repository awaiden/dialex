# NestJS

## Modül

```ts
import { Module } from "@nestjs/common";
import { DialexModule } from "dialexjs/nestjs";
import dictionaries from "./dialex.generated.js";

@Module({
  imports: [DialexModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
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
    dictionaries,
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
