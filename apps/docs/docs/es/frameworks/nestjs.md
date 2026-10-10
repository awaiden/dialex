# NestJS

## Módulo

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

`forRoot` también acepta `isGlobal` (por defecto `true`). Para una configuración asíncrona:

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

## Controladores

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

## Exportaciones

| Exportación                             | Descripción                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DialexModule.forRoot / forRootAsync`   | Registro del módulo dinámico                                                                        |
| `DialexService`                         | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `DialexInterceptor`, `DialexMiddleware` | Añaden `req.locale` y `req.getDictionary`                                                           |
| `@DialexLocale()`                       | Decorador de parámetro para el locale resuelto                                                      |
| `@DialexDictionary(name)`               | Decorador de parámetro para un diccionario                                                          |
| `DIALEX_OPTIONS`                        | Token de inyección para las opciones del módulo                                                     |

`DialexLocale` e `DialexDictionary` leen lo que el interceptor o el middleware adjuntó a la petición, así que asegúrate de aplicar uno de ellos. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
