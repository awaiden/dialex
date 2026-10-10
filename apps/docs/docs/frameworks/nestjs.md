# NestJS

## Module

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

`forRoot` also accepts `isGlobal` (default `true`). For async configuration:

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

## Controllers

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

## Exports

| Export                                  | Description                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot / forRootAsync`   | Dynamic module registration                                                                         |
| `DialexService`                         | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `DialexInterceptor`, `DialexMiddleware` | Attach `req.locale` and `req.getDictionary`                                                         |
| `@DialexLocale()`                       | Parameter decorator for the resolved locale                                                         |
| `@DialexDictionary(name)`               | Parameter decorator for a dictionary                                                                |
| `DIALEX_OPTIONS`                        | Injection token for the module options                                                              |

`DialexLocale` and `DialexDictionary` read what the interceptor or middleware attached to the request, so make sure one of them is applied. All [locale detection options](../guide/locale-detection.md#options) apply.
