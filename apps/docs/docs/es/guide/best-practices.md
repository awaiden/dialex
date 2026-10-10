# Buenas prácticas

Estas recomendaciones valen para cualquier framework. Cada una se deriva de cómo funciona Dialex: los diccionarios se compilan en `dialex.generated.ts`, el locale se resuelve una vez por petición o por aplicación, y los tipos salen de tus diccionarios.

## Organiza los diccionarios

- Usa un diccionario por funcionalidad o página, junto al código que lo usa (`checkout.content.ts` junto a la página de pago). Los archivos pequeños son fáciles de revisar, traducir y cargar de forma diferida.
- Pon el texto compartido por toda la aplicación en un diccionario `common` y deja fuera todo lo demás, para que no se convierta en un cajón de sastre.
- Da a todos los diccionarios los mismos locales. `dx check` informa de las claves y locales que faltan, y las extensiones del editor los muestran mientras escribes.

## Nombra las claves por su significado

Una clave dice para qué sirve el texto, no lo que dice ahora. Cuando cambia la redacción, la clave y todos los puntos de uso siguen igual.

```ts
// Good: the key describes the role
defineDictionary("checkout", {
  en: { payButton: "Pay now", emptyCart: "Your cart is empty" },
  tr: { payButton: "Şimdi öde", emptyCart: "Sepetiniz boş" },
});

// Avoid: the key repeats the English text, and breaks when the text changes
defineDictionary("checkout", {
  en: { payNow: "Pay now", yourCartIsEmpty: "Your cart is empty" },
});
```

Agrupa las claves relacionadas bajo un objeto (`nav.about`, `nav.contact`) y mantén el anidamiento poco profundo, de dos o tres niveles. Los árboles más profundos son difíciles de leer en llamadas `t("...")`.

## Escribe mensajes que los traductores puedan completar

- Usa [mensajes ICU](./icu.md) para plurales, selecciones y números: `{count, plural, one {# item} other {# items}}`. Nunca construyas una frase con piezas (`"You have " + n + " items"`), porque el orden de las palabras y las formas plurales difieren entre idiomas.
- Prefiere cadenas ICU a valores de función para el texto que va a los traductores. Las funciones sirven para lógica que solo tocan los desarrolladores, pero las herramientas de traducción y `dx check` pueden validar una cadena ICU y no pueden mirar dentro de una función.
- Mantén los marcadores igual en todos los locales. `dx check` informa de un locale cuyos argumentos difieren de los demás.

```ts
defineDictionary("cart", {
  en: { items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}" },
  tr: { items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}" },
});

t("cart.items", { count: 3 }); // "3 items"; `count` is checked at compile time
```

## Mantén al día el archivo generado

- Confirma `dialex.generated.ts` y `dialex-env.d.ts` en el repositorio. La aplicación los importa, y un checkout limpio debería compilar sin un paso de generación.
- Mientras desarrollas, mantenlo al día con `dx generate --watch`, o usa la extensión de VS Code o Zed, que lo regeneran por ti cuando cambia un diccionario.
- En CI ejecuta `dx check --fail-on-stale`. Falla cuando el archivo generado confirmado ya no coincide con los diccionarios, cuando faltan claves o locales y cuando las traducciones están desactualizadas.

```yaml
# .github/workflows/ci.yml
- run: bun install --frozen-lockfile
- run: bunx dx check --fail-on-stale
```

## Resuelve el locale en un solo lugar

- Decide el locale una vez por petición (en el servidor) o una vez por aplicación (en el navegador) y pásalo hacia abajo. No leas cookies ni `navigator.language` en componentes individuales.
- Con renderizado en el servidor, da al cliente el locale que usó el servidor (`initialLocale`) para que el primer render del cliente coincida con el HTML. Si no, la página parpadea con el idioma equivocado o la hidratación informa de una discrepancia.
- Establece `<html lang>` con el locale activo. Los providers de React, Svelte y Solid lo hacen por ti; en el servidor, escríbelo en el HTML que renderizas.
- Recuerda la elección del visitante en la cookie `locale`, que leen los adaptadores de servidor, en lugar de en `localStorage`, que el servidor no puede ver.

## Carga solo lo que necesita una página

- Las aplicaciones pequeñas no necesitan carga diferida: todos los diccionarios en un solo bundle es lo más simple y rápido. Actívala cuando los diccionarios sean una parte notable del bundle.
- Con `lazy: "locale"`, un visitante descarga solo los diccionarios de la página que abre, en el idioma que usa. Consulta [Carga diferida](./lazy-loading.md).
- Precarga lo que necesita la siguiente navegación (`preloadDictionaries(dialex, "checkout")`) para que la página no espere una descarga.

## Traduce con un paso de revisión

- `dx translate` rellena las claves que faltan con marcadores `[TODO]` o traducciones automáticas. Trata su salida como cualquier otro cambio: revisa el diff antes de fusionar.
- Confirma `dialex.lock.json`. Registra de qué texto fuente salió cada traducción, de modo que `dx check` y `dx translate --stale` puedan saber cuándo cambió el inglés y la traducción no.
- Busca `[TODO]` antes de una versión. `dx check` informa de todos los marcadores que siguen ahí.

## Prueba con los diccionarios reales

- Renderiza los componentes con la misma exportación `dialex` que usa la aplicación y comprueba el texto de un locale. [Pruebas](./testing.md) tiene envoltorios para React y Vue.
- Prueba al menos el locale por defecto y otro, para que una clave que falta o una forma plural aparezca en la ejecución de pruebas y no en producción.

## Trabaja con tu editor

- Instala la [extensión de VS Code](./vscode.md), o usa [Zed y otros editores](./zed.md) mediante el servidor de lenguaje. Obtienes diagnósticos, hover, ir a la definición, autocompletado y correcciones rápidas para las claves.
- Guarda un diccionario en una variable (`const home = useDictionary("home")`) y el editor sigue resolviendo `home.title`.
- Mantén fuera del análisis los archivos generados y la salida de compilación: Dialex ya respeta `.gitignore`, y `exclude` en `dialex.config.ts` cubre el resto.

## Lista de comprobación

| Antes de publicar                                   | Comando o ajuste                           |
| --------------------------------------------------- | ------------------------------------------ |
| Los diccionarios y el archivo generado coinciden    | `dx check --fail-on-stale`                 |
| No faltan claves ni locales                         | `dx check`                                 |
| No quedan marcadores                                | `[TODO]`                                   |
| Las traducciones coinciden con el texto fuente      | `dx translate --stale`, `dialex.lock.json` |
| `<html lang>` sigue al locale                       | provider o marcado del servidor            |
| El bundle solo contiene los diccionarios necesarios | `lazy: "locale"`                           |
