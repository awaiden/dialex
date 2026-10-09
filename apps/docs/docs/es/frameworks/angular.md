# Angular

`dialexjs/angular` ofrece el locale activo, los diccionarios y `t` como signals de Angular.

::: warning Versiones
Desarrollado y probado con Angular 22. Usa únicamente `signal`, `computed`, `inject`, `InjectionToken`, `makeEnvironmentProviders` y `afterNextRender`, por lo que está pensado para Angular 17 y posteriores, pero las versiones anteriores no se han probado. No se ha ejecutado dentro de una aplicación de Angular CLI; las pruebas ejercitan un injector de aplicación real de Angular en un entorno DOM.
:::

## Configuración

Angular recibe los diccionarios de forma explícita, igual que los adaptadores de servidor. Genéralos con la CLI:

```bash
dialex generate        # writes src/dialex.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialexjs/angular";
import dictionaries from "../dialex.generated";

export const appConfig: ApplicationConfig = {
  providers: [
    provideDialex({
      dictionaries,
      defaultLocale: "en",
      locales: ["en", "tr"],
    }),
  ],
};
```

Vuelve a ejecutar `dialex generate` (o `dialex generate --watch`) cada vez que cambies un diccionario.

## Usarlo en un componente

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectDialex, injectT } from "dialexjs/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ dialex.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly dialex = injectDialex();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.dialex.setLocale(this.dialex.locale() === "en" ? "tr" : "en");
  }
}
```

| Función                  | Devuelve                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `injectDialex()`         | El store: `locale` (un `Signal<string>`), `setLocale(locale)`, `dictionary(name)`, `t`                        |
| `injectDictionary(name)` | Un `Signal` con el diccionario del locale activo, siguiendo los [fallbacks](../guide/fallbacks.md)            |
| `injectT()`              | Una [función `t`](../guide/key-paths.md) para el locale activo, con compatibilidad con [ICU](../guide/icu.md) |

Llámalas en un contexto de inyección, como un inicializador de campo o el constructor. Como `t` lee el signal del locale cada vez que se llama, llamarla desde una plantilla mantiene esa plantilla actualizada cuando cambia el locale.

### Por qué no hay un pipe `| t`

Los pipes de Angular necesitan el compilador propio de Angular, y Dialex se distribuye como JavaScript plano, igual que sus otros adaptadores. La función `t` funciona igual en las plantillas: `{{ t('home.title') }}`.

## Opciones

| Opción          | Valor por defecto | Descripción                                                                                                                                                      |
| --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | obligatorio       | Resultados de `defineDictionary` o un mapa `{ name: { locale: content } }`, normalmente de `dialex generate`                                                     |
| `defaultLocale` | `"en"`            | Locale que se usa cuando nada más decide                                                                                                                         |
| `locales`       |                   | Locales compatibles. Un locale recordado que no esté en esta lista se ignora                                                                                     |
| `fallbacks`     |                   | [Cadenas de fallback](../guide/fallbacks.md) explícitas                                                                                                          |
| `initialLocale` |                   | El locale que se renderiza primero: una cadena, o una función que se ejecuta en el contexto de inyección. Si se define, el locale recordado no se aplica después |
| `persist`       | `"cookie"`        | Dónde se recuerda la elección: `"cookie"`, `"localStorage"` o `false`                                                                                            |
| `storageKey`    | `"locale"`        | Clave de la cookie o de localStorage                                                                                                                             |

El locale recordado se aplica después del primer renderizado, de modo que el marcado renderizado en el servidor y el primer renderizado del cliente siempre coinciden. `<html lang>` sigue al locale activo.

## Renderizado en el servidor

Con Angular SSR el primer renderizado ocurre en el servidor, así que indica a Dialex qué locale quiere la petición pasando `initialLocale` como función. Se ejecuta en el contexto de inyección, por lo que puede hacer `inject()` de lo que proporcione tu servidor:

```ts
import { inject } from "@angular/core";
import { REQUEST } from "@angular/core"; // location depends on your Angular SSR version

provideDialex({
  dictionaries,
  initialLocale: () => {
    const request = inject(REQUEST, { optional: true });
    const cookie = request?.headers.get("cookie") ?? "";
    return /(?:^|;\s*)locale=([^;]+)/.exec(cookie)?.[1] ?? "en";
  },
});
```

::: warning Receta sin probar
La función `initialLocale` está cubierta por pruebas, pero este ejemplo con `REQUEST` no se ha ejecutado en una configuración real de Angular SSR. El nombre del token y su ruta de importación han cambiado entre versiones de Angular; consulta la documentación de SSR de tu versión.
:::

## Carga diferida

Los diccionarios se pasan al arrancar, por lo que la [carga diferida](../guide/lazy-loading.md) no se aplica a Angular. Divide los diccionarios grandes importando solo los que necesites en los `dictionaries` que pases.

## Pruebas

`provideDialex` funciona en `TestBed` como cualquier provider:

```ts
TestBed.configureTestingModule({
  providers: [provideDialex({ dictionaries, defaultLocale: "tr", persist: false })],
});
```

Para el código que no necesita Angular, usa [`createTestDialex`](../guide/testing.md).
