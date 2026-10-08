# Formato y plurales

Dialex incluye pequeños helpers con tipos construidos sobre `Intl`. Viven en el paquete `dialexjs` y funcionan en cualquier lugar donde se ejecuten funciones de diccionario: servidor o cliente.

```ts
import { defineDictionary, plural, formatters } from "dialexjs";

const en = formatters("en");

export default defineDictionary("cart", {
  en: {
    items: (n: number) => plural("en", n, { one: "1 item", other: `${n} items` }),
    total: (amount: number) =>
      `Total: ${en.number(amount, { style: "currency", currency: "USD" })}`,
  },
  tr: {
    items: (n: number) => plural("tr", n, { other: `${n} ürün` }),
    total: (amount: number) =>
      `Toplam: ${formatters("tr").number(amount, { style: "currency", currency: "TRY" })}`,
  },
});
```

## Helpers

| Helper                                     | Basado en                 | Notas                                                                       |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------------------- |
| `plural(locale, count, forms)`             | `Intl.PluralRules`        | `other` es obligatorio; `zero`, `one`, `two`, `few` y `many` son opcionales |
| `number(locale, value, options?)`          | `Intl.NumberFormat`       | Moneda, porcentaje, unidades, notación compacta                             |
| `date(locale, value, options?)`            | `Intl.DateTimeFormat`     | Acepta `Date`, marca de tiempo o cadena ISO                                 |
| `relativeTime(locale, value, unit, opts?)` | `Intl.RelativeTimeFormat` | `relativeTime("en", -1, "day", { numeric: "auto" })` → `"yesterday"`        |
| `list(locale, values, options?)`           | `Intl.ListFormat`         | `list("en", ["a", "b", "c"])` → `"a, b, and c"`                             |
| `formatters(locale)`                       | todos los anteriores      | Devuelve los helpers ya vinculados a un locale, sin el argumento `locale`   |

`plural` sigue las reglas CLDR del locale: el inglés usa `one`/`other`, el francés trata 0 y 1 como `one`, y el ruso y el árabe usan `few`/`many` (y `zero`/`two` en árabe). Si la categoría de un locale no tiene una forma correspondiente, se usa `other`.

Para mensajes escritos como cadenas con `{count, plural, ...}`, consulta [Mensajes ICU](./icu.md).

Los helpers reciben el locale como argumento explícito porque el contenido de cada locale se escribe dentro de su propio bloque del diccionario.
