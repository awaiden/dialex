# NestJS

## Modul

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

`forRoot` akzeptiert außerdem `isGlobal` (Standard `true`). Für asynchrone Konfiguration:

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

## Controller

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

## Exporte

| Export                                  | Beschreibung                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot / forRootAsync`   | Registrierung des dynamischen Moduls                                                                |
| `DialexService`                         | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `DialexInterceptor`, `DialexMiddleware` | Hängen `req.locale` und `req.getDictionary` an                                                      |
| `@DialexLocale()`                       | Parameter-Dekorator für das ermittelte Locale                                                       |
| `@DialexDictionary(name)`               | Parameter-Dekorator für ein Wörterbuch                                                              |
| `DIALEX_OPTIONS`                        | Injection-Token für die Moduloptionen                                                               |

`DialexLocale` und `DialexDictionary` lesen, was der Interceptor oder die Middleware an die Anfrage angehängt hat; stelle also sicher, dass eines von beiden angewendet wird. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.
