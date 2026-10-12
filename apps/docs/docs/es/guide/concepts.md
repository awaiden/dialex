# Cómo funciona Dialex

Dialex guarda tus traducciones en TypeScript, las convierte en un módulo generado y en declaraciones de tipos antes de que tu app se ejecute, y las lee de vuelta con simples consultas a objetos. Esta página es el mapa: léela una vez y el resto de la documentación encaja.

## La canalización

```text
  src/home.content.ts            dialex generate              your app at runtime
  ┌────────────────────┐        ┌──────────────────┐        ┌───────────────────────┐
  │ defineDictionary(  │  ───►  │ dialex.generated │  ───►  │ adapter or provider   │
  │   "home", { en,tr })│        │   .ts            │        │ resolves the locale   │
  └────────────────────┘        │ dialex-env.d.ts  │        │ getDictionary / t()   │
        you write                └──────────────────┘        └───────────────────────┘
                                    CLI, build time              runtime, per request
```

1. **Tú escribes diccionarios.** Un archivo `*.content.ts` por diccionario, junto al código que lo usa, cada uno una llamada `defineDictionary("name", { en: {...}, tr: {...} })`. Consulta [Diccionarios](./dictionaries.md).
2. **`dialex generate` los compila.** Lee los archivos desde su árbol de sintaxis (no ejecuta tu código), escribe `dialex.generated.ts` (los diccionarios y una copia de tu configuración segura para el cliente) y `dialex-env.d.ts` (los tipos). Consulta [`dialex generate`](../cli/generate.md).
3. **Un adaptador resuelve el locale.** En un servidor mira la URL, la cadena de consulta, la cookie y `Accept-Language`; en un framework de UI, un proveedor guarda el locale activo. Consulta [Detección de locale](./locale-detection.md).
4. **Tu código lee un diccionario.** `getDictionary("home").title`, `t("home.title")` o un hook. Es una consulta a un objeto, más el formato ICU cuando pasas valores.

Nada escanea el sistema de archivos en ejecución, y nada se analiza dos veces: los mensajes ICU se compilan una vez, en el primer uso.

## Qué es cada pieza

| Pieza                   | Qué es                                                                                                            | Dónde vive                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Diccionario             | Un objeto con nombre que asigna a cada locale su contenido: cadenas, objetos anidados, funciones                  | `*.content.ts`                                  |
| Ruta de clave           | La dirección de un valor: `home.nav.about` es el diccionario `home`, clave `nav.about`                            | En `t("home.nav.about")`                        |
| Configuración           | `defaultLocale`, `locales`, `fallbacks`, `lazy`, `translate`...                                                   | `dialex.config.ts`                              |
| Módulo generado         | Los diccionarios y ajustes, como un único archivo importable                                                      | `dialex.generated.ts` (no lo edites)            |
| Declaraciones de tipos  | Amplían `DictionaryRegistry` para que nombres y rutas se autocompleten y se comprueben                            | `dialex-env.d.ts` (no lo edites)                |
| Adaptador               | Pegamento del framework: resuelve el locale y te da `getDictionary` y `t`                                         | `dialexjs/<framework>`                          |
| CLI                     | `generate`, `check`, `export`, `import`, `translate`, `lock`, `init`                                              | `@dialexjs/cli`                                 |
| Herramientas del editor | Diagnósticos, hover, ir a la definición, autocompletado y correcciones rápidas, con el mismo análisis que `check` | Extensión de VS Code, servidor de lenguaje, Zed |

## Qué se decide cuándo

| Se decide en        | Qué                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Al escribir         | Qué claves existen y qué tipo tiene cada una                                                                              |
| `dialex generate`   | El módulo generado y los tipos. Un cambio en un diccionario o en la configuración no se ve hasta que lo ejecutas de nuevo |
| `dialex check` (CI) | Si cada locale tiene cada clave, si los mensajes ICU son válidos y coherentes, si el código se refiere a claves reales    |
| Petición o render   | El locale y, por tanto, qué contenido se lee; aquí se formatean los valores ICU                                           |

Como los tipos salen del archivo generado, **olvidar ejecutar `dialex generate` es la causa más común de "los tipos están mal"**. Ejecuta `dialex generate --watch` mientras desarrollas, usa la extensión del editor (regenera al guardar) y deja que `dialex check` haga fallar la CI cuando el archivo esté desactualizado.

## Las tres formas de expresar un mensaje

| Forma         | Ejemplo                                                  | Úsala para                                                                                     |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Cadena simple | `title: "Welcome"`                                       | Texto sin valores                                                                              |
| Cadena ICU    | `items: "{count, plural, one {# item} other {# items}}"` | Valores, plurales, selects, números y fechas; funciona con las herramientas de los traductores |
| Función       | `` greeting: (name: string) => `Hello, ${name}!` ``      | TypeScript completo, incluido `plural()` y los demás [formateadores](../api/formatting.md)     |

Las tres pueden estar en el mismo diccionario. Consulta [Mensajes ICU](./icu.md) y [Formato y plurales](./formatting.md).

## A dónde ir después

- Empezar un proyecto: [Primeros pasos](./getting-started.md) y luego tu [framework](../frameworks/README.md).
- Consultar algo: la [referencia de la API](../api/README.md) y la [referencia de la CLI](../cli/README.md).
- Algo no funciona: [Solución de problemas](./troubleshooting.md).
