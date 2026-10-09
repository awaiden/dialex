# Configuración

Dialex carga `dialex.config.*` (o `i18n.config.*`) desde la raíz del proyecto; se admiten `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` y `.json`.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Opción          | Tipo                          | Valor por defecto   | Descripción                                                                                                                                                                |
| --------------- | ----------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Locale que se usa cuando no se puede resolver ninguno                                                                                                                      |
| `locales`       | `string[]`                    | —                   | Locales admitidos; habilita el estrechamiento de tipos de locale y las comprobaciones de paridad. Si se omite, `dx generate` usa los locales que definen tus diccionarios  |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) de los archivos de diccionario                                                                                                                                     |
| `configFile`    | `string`                      | —                   | Ruta personalizada de la configuración                                                                                                                                     |
| `fallbacks`     | `Record<string, string[]>`    | —                   | [Cadenas de fallback](./fallbacks.md) explícitas por locale                                                                                                                |
| `prefixDefault` | `boolean`                     | `true`              | Indica si el locale por defecto también lleva prefijo en la URL. Lo leen `DialexLink` y los [helpers de enrutamiento](./routing.md)                                        |
| `lazy`          | `boolean \| "locale"`         | `false`             | Carga los diccionarios bajo demanda (bundles de cliente): `true` divide por diccionario, `"locale"` por diccionario y locale. Consulta [Carga diferida](./lazy-loading.md) |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Proveedor para [`dialex translate`](../cli/translate.md)                                                                                                                   |

El archivo es opcional: sin él se aplican todos los valores por defecto de arriba. `dx generate` copia los ajustes que necesita el runtime (no `translate`) a `dialex.generated.ts`, así que vuelve a ejecutarlo tras cambiar el archivo.
