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

| Opción          | Tipo                          | Valor por defecto   | Descripción                                                                                                                                                                                |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defaultLocale` | `string`                      | `"en"`              | Locale que se usa cuando no se puede resolver ninguno                                                                                                                                      |
| `locales`       | `string[]`                    | —                   | Locales admitidos; habilita el estrechamiento de tipos de locale y las comprobaciones de paridad. Si se omite, `dx generate` usa los locales que definen tus diccionarios                  |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) de los archivos de diccionario                                                                                                                                                     |
| `exclude`       | `string[]`                    | —                   | Globs, relativos al proyecto, que nunca se analizan en busca de diccionarios o fuentes                                                                                                     |
| `output`        | `string`                      | —                   | Dónde escribe `dialex generate` el archivo `dialex.generated.ts`, relativo al proyecto; las declaraciones de tipos van junto a él. Por defecto `src/`, o la raíz del proyecto si no existe |
| `configFile`    | `string`                      | —                   | Ruta personalizada de la configuración                                                                                                                                                     |
| `fallbacks`     | `Record<string, string[]>`    | —                   | [Cadenas de fallback](./fallbacks.md) explícitas por locale                                                                                                                                |
| `prefixDefault` | `boolean`                     | `true`              | Indica si el locale por defecto también lleva prefijo en la URL. Lo leen `DialexLink` y los [helpers de enrutamiento](./routing.md)                                                        |
| `lazy`          | `boolean \| "locale"`         | `false`             | Carga los diccionarios bajo demanda (bundles de cliente): `true` divide por diccionario, `"locale"` por diccionario y locale. Consulta [Carga diferida](./lazy-loading.md)                 |
| `lint`          | `{ rules }`                   | —                   | Desactiva comprobaciones o cambia su nivel y opciones, para `dialex check`, los editores y las [reglas de ESLint y oxlint](./linting.md)                                                   |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Proveedor para [`dialex translate`](../cli/translate.md)                                                                                                                                   |

Dialex omite `node_modules`, la salida de compilación y todo lo que ignoren tus archivos `.gitignore` (incluido el del repositorio, para un paquete dentro de un monorepo). Usa `exclude` para cualquier otra cosa, como una carpeta vendorizada que sí subes.

El archivo es opcional: sin él se aplican todos los valores por defecto de arriba. `dx generate` copia los ajustes que necesita el runtime (no `translate`) a `dialex.generated.ts`, así que vuelve a ejecutarlo tras cambiar el archivo.

## Dónde se encuentra el archivo

Las herramientas buscan en la raíz del proyecto (la carpeta desde la que ejecutas `dialex`, o la carpeta del proyecto en el editor) `dialex.config.<ext>` y luego `i18n.config.<ext>`, con `<ext>` uno de `ts`, `mts`, `cts`, `js`, `mjs`, `cjs` o `json`. Gana el primero que se encuentre. `-c, --config <path>` (o el ajuste del editor `dialex.configPath`) apunta a otro archivo. En un monorepo, cada paquete que tiene configuración es su propio proyecto, y un paquete con solo diccionarios usa los valores por defecto.

## Cómo la leen las herramientas

| Herramienta                                                 | Lee la configuración                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `dialex generate`, `check`, `export`, `import`, `translate` | Ejecutando el archivo, así que los valores pueden calcularse (`locales: getLocales()`) |
| La extensión del editor y el servidor de lenguaje           | Leyendo su árbol de sintaxis, y nunca ejecutándola                                     |

Una configuración hecha de literales (cadenas, arrays, booleanos) se entiende en todas partes. Un ajuste calculado es invisible para el editor, que entonces usa el valor por defecto y registra una nota. Si un editor debe conocer `locales`, escríbelos.

## Ejemplos

Un proyecto con fallbacks regionales y el locale por defecto servido sin prefijo:

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "pt", "pt-BR", "es"],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
});
```

Un framework cuya carpeta de código no es `src/`, con una carpeta vendorizada excluida:

```ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
  exclude: ["vendor/**"],
});
```
