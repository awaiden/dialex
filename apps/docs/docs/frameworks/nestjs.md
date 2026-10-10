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

## Best practices

- Import `DialexModule.forRoot({ ...dialex })` once in the root module. It is global by default, so feature modules do not import it again.
- Take the locale and dictionaries as parameters with `@DialexLocale()` and `@DialexDictionary("home")` instead of reading `req`, which keeps controllers easy to test.
- Register `DialexInterceptor` with `APP_INTERCEPTOR` for the whole app, or apply `DialexMiddleware` in `configure()` when you need the locale before guards run.

## Troubleshooting

- **`Nest can't resolve dependencies of ... (DialexService)`**: `DialexModule.forRoot(...)` is not imported in the module graph, or `isGlobal` was turned off.
- **`req.getDictionary` is undefined**: neither `DialexInterceptor` nor `DialexMiddleware` is registered. The decorators and `DialexService` work without them, the request properties do not.
- **`[dialex] Dictionary "x" not found`**: the dictionary is not in `dialex.generated.ts`. Run `dx generate` and check that `include` in `dialex.config.ts` matches the file.
