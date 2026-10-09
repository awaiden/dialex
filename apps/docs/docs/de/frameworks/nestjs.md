# NestJS

## Modul

```ts
import { Module } from "@nestjs/common";
import { I18nModule } from "dialexjs/nestjs";
import dictionaries from "./dialex.generated.js";

@Module({
  imports: [I18nModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` akzeptiert außerdem `isGlobal` (Standard `true`). Für asynchrone Konfiguration:

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

## Controller

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

## Exporte

| Export                              | Beschreibung                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nModule.forRoot / forRootAsync` | Registrierung des dynamischen Moduls                                                                |
| `I18nService`                       | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `I18nInterceptor`, `I18nMiddleware` | Hängen `req.locale` und `req.getDictionary` an                                                      |
| `@I18nLocale()`                     | Parameter-Dekorator für das ermittelte Locale                                                       |
| `@I18nDictionary(name)`             | Parameter-Dekorator für ein Wörterbuch                                                              |
| `I18N_OPTIONS`                      | Injection-Token für die Moduloptionen                                                               |

`I18nLocale` und `I18nDictionary` lesen, was der Interceptor oder die Middleware an die Anfrage angehängt hat; stelle also sicher, dass eines von beiden angewendet wird. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
