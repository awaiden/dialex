# NestJS

## Modül

```ts
import { Module } from "@nestjs/common";
import { I18nModule } from "dialexjs/nestjs";
import dictionaries from "./i18n.generated.js";

@Module({
  imports: [I18nModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` ayrıca `isGlobal` seçeneğini de kabul eder (varsayılan `true`). Asenkron yapılandırma için:

```ts
I18nModule.forRootAsync({
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
import { I18nLocale, I18nDictionary } from "dialexjs/nestjs";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@I18nLocale() locale: string, @I18nDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}
```

## Dışa aktarımlar

| Dışa aktarım                        | Açıklama                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nModule.forRoot / forRootAsync` | Dinamik modül kaydı                                                                                 |
| `I18nService`                       | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `I18nInterceptor`, `I18nMiddleware` | `req.locale` ve `req.getDictionary` değerlerini ekler                                               |
| `@I18nLocale()`                     | Çözülen yerel ayar için parametre dekoratörü                                                        |
| `@I18nDictionary(name)`             | Bir sözlük için parametre dekoratörü                                                                |
| `I18N_OPTIONS`                      | Modül seçenekleri için enjeksiyon belirteci                                                         |

`I18nLocale` ve `I18nDictionary`, interceptor'ın veya middleware'in isteğe eklediği değerleri okur; bu yüzden bunlardan birinin uygulandığından emin olun. Tüm [yerel ayar algılama seçenekleri](../guide/locale-detection.md#options) geçerlidir.
