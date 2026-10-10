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

## Buenas prácticas

- Importa `DialexModule.forRoot({ ...dialex })` una vez en el módulo raíz. Es global por defecto, así que los módulos de funcionalidad no lo importan de nuevo.
- Toma el locale y los diccionarios como parámetros con `@DialexLocale()` y `@DialexDictionary("home")` en lugar de leer `req`, lo que mantiene los controladores fáciles de probar.
- Registra `DialexInterceptor` con `APP_INTERCEPTOR` para toda la aplicación, o aplica `DialexMiddleware` en `configure()` cuando necesites el locale antes de que se ejecuten los guards.

## Solución de problemas

- **`Nest can't resolve dependencies of ... (DialexService)`**: `DialexModule.forRoot(...)` no está importado en el grafo de módulos, o `isGlobal` se desactivó.
- **`req.getDictionary` es undefined**: no está registrado ni `DialexInterceptor` ni `DialexMiddleware`. Los decoradores y `DialexService` funcionan sin ellos, las propiedades de la petición no.
- **`[dialex] Dictionary "x" not found`**: el diccionario no está en `dialex.generated.ts`. Ejecuta `dx generate` y comprueba que `include` en `dialex.config.ts` coincide con el archivo.
