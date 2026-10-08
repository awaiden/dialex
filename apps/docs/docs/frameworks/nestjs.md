# NestJS

## Module

```ts
import { Module } from "@nestjs/common";
import { I18nModule } from "dialex/nestjs";
import dictionaries from "./i18n.generated.js";

@Module({
  imports: [I18nModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
  controllers: [AppController],
})
export class AppModule {}
```

`forRoot` also accepts `isGlobal` (default `true`). For async configuration:

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

## Controllers

```ts
import { Controller, Get } from "@nestjs/common";
import { I18nLocale, I18nDictionary } from "dialex/nestjs";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@I18nLocale() locale: string, @I18nDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}
```

## Exports

| Export                              | Description                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nModule.forRoot / forRootAsync` | Dynamic module registration                                                                         |
| `I18nService`                       | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `I18nInterceptor`, `I18nMiddleware` | Attach `req.locale` and `req.getDictionary`                                                         |
| `@I18nLocale()`                     | Parameter decorator for the resolved locale                                                         |
| `@I18nDictionary(name)`             | Parameter decorator for a dictionary                                                                |
| `I18N_OPTIONS`                      | Injection token for the module options                                                              |

`I18nLocale` and `I18nDictionary` read what the interceptor or middleware attached to the request, so make sure one of them is applied. All [locale detection options](../guide/locale-detection.md#options) apply.
