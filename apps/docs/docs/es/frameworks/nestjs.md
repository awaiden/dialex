# NestJS

## Módulo

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

`forRoot` también acepta `isGlobal` (por defecto `true`). Para una configuración asíncrona:

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

## Controladores

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

## Exportaciones

| Exportación                         | Descripción                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `I18nModule.forRoot / forRootAsync` | Registro del módulo dinámico                                                                        |
| `I18nService`                       | `resolveLocale(req)`, `getDictionary(name, locale?)`, `getDefaultLocale()`, `getSupportedLocales()` |
| `I18nInterceptor`, `I18nMiddleware` | Añaden `req.locale` y `req.getDictionary`                                                           |
| `@I18nLocale()`                     | Decorador de parámetro para el locale resuelto                                                      |
| `@I18nDictionary(name)`             | Decorador de parámetro para un diccionario                                                          |
| `I18N_OPTIONS`                      | Token de inyección para las opciones del módulo                                                     |

`I18nLocale` e `I18nDictionary` leen lo que el interceptor o el middleware adjuntó a la petición, así que asegúrate de aplicar uno de ellos. Se aplican todas las [opciones de detección de locale](../guide/locale-detection.md#options).
