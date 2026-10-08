# Mensajes ICU

Las cadenas de un diccionario pueden ser mensajes [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/). Pasa un objeto de valores a `t` y Dialex formatea el mensaje para el locale activo.

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("cart", {
  en: {
    items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    owner: "Hello, {name}!",
  },
  ru: {
    items: "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}",
    owner: "Здравствуйте, {name}!",
  },
});
```

```ts
t("cart.items", { count: 5 }); // en: "5 items"   ru: "5 товаров"
t("cart.owner", { name: "Ada" }); // "Hello, Ada!"
t("cart.owner"); // no values: the string is returned unchanged
```

Los mensajes ICU conviven con las cadenas simples y con los [valores de tipo función](./dictionaries.md#values); no cambia nada para los diccionarios existentes. Los mensajes se analizan una sola vez y se guardan en caché.

## Sintaxis

| Sintaxis                 | Ejemplo                                                                                      | Notas                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Argumento                | `{name}`                                                                                     | Cualquier valor; se convierte con `String()`                                                                                                |
| Número                   | `{n, number}`, `{n, number, integer}`, `{n, number, percent}`, `{n, number, ::currency/USD}` | `Intl.NumberFormat`                                                                                                                         |
| Fecha, hora              | `{d, date, long}`, `{d, time, short}`                                                        | Estilos `short`, `medium` (por defecto), `long`, `full`; el valor es un `Date`, una marca de tiempo o una cadena de fecha                   |
| Plural                   | `{n, plural, =0 {none} one {# item} other {# items}}`                                        | Coincidencias exactas `=N`, y después las categorías CLDR del locale (`zero`, `one`, `two`, `few`, `many`, `other`). `other` es obligatorio |
| Desplazamiento de plural | `{n, plural, offset:1 =0 {nobody} one {you and # other} other {you and # others}}`           | `#` y las categorías usan `n - offset`; `=N` coincide con el `n` original                                                                   |
| Ordinal                  | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`                              | Reglas de plural ordinal                                                                                                                    |
| Select                   | `{gender, select, female {She} male {He} other {They}}`                                      | Compara el valor como cadena. `other` es obligatorio                                                                                        |
| `#`                      | dentro de una rama de plural                                                                 | El número formateado. Un `select` anidado en un plural sigue refiriéndose al plural que lo contiene                                         |
| Comillas                 | `'{'`, `'}'`, `''`                                                                           | `''` es un apóstrofo. Un `'` suelto que no precede a una llave es texto literal                                                             |

Las ramas pueden contener cualquiera de lo anterior, de modo que los plurales y los selects se pueden anidar.

### No admitido

- Las etiquetas de texto enriquecido como `<b>…</b>` no se interpretan; son texto plano.
- No se admiten esqueletos de número distintos de `::percent` y `::currency/XXX`, ni esqueletos de fecha. Los estilos de número o fecha desconocidos recurren al estilo por defecto.

## Errores

Si un mensaje no se puede formatear, por ejemplo porque falta un valor, `t` registra una advertencia y devuelve el mensaje sin cambios, de modo que una cadena defectuosa nunca rompe una página. `formatMessage` en sí lanza `IcuFormatError` (valores ausentes o no válidos) o `IcuSyntaxError` (con una posición).

```ts
import { formatMessage } from "dialexjs";

formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: 3 });
```

## Tipos

Los nombres de los argumentos **no** se comprueban en tiempo de compilación: las cadenas de los diccionarios tienen tipo `string`, así que TypeScript no puede ver los argumentos que contienen. Las discrepancias entre locales las detecta en su lugar [`dialex check`](../cli/check.md). `t` solo comprueba que una clave de tipo cadena reciba un objeto de valores (o nada), y las claves de tipo función conservan sus propios tipos de parámetros.

## Herramientas

- [`dialex check`](../cli/check.md) informa de ICU no válido, de locales que usan argumentos distintos a los del locale por defecto y de opciones de plural que faltan para un idioma (el ruso necesita `few` y `many`, por ejemplo).
- [`dialex translate`](../cli/translate.md) mantiene la estructura intacta: los argumentos, los tipos, las claves de `select` y las coincidencias exactas `=N` deben conservarse, mientras que las categorías de plural pueden cambiar. Los proveedores que no pueden hacerlo (DeepL) nunca reciben mensajes ICU.
- [`dialex import`](../cli/import.md) rechaza los valores que son ICU no válido o que cambian los argumentos de la misma clave en otro locale.
- [`dialex export`](../cli/export.md) escribe los mensajes ICU como cadenas simples. Pide a los traductores que mantengan intacta la estructura entre `{ }` y que traduzcan solo el texto de las ramas.
