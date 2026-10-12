# Benchmarks

Números de las partes de una librería de i18n que se ejecutan en los navegadores de tus usuarios y en tus servidores: la rapidez con que se formatea un mensaje y cuántos bytes añade la librería a un bundle. Comparan Dialex con [i18next](https://www.i18next.com), [intl-messageformat](https://formatjs.github.io) (el núcleo de FormatJS detrás de `react-intl`), [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) e [Intlayer](https://intlayer.org).

::: tip Léelos como una guía, no como un veredicto
Un micro-benchmark mide una cosa en una máquina. El coste de tu app suele estar en otro sitio: renderizado, red, datos. Usa estos números para comparar las librerías entre sí, y ejecuta el benchmark en tu propio hardware antes de fiarte de ellos.
:::

## Qué se mide

Cuatro mensajes, formateados en inglés por cada librería, con los mismos valores. Antes de medir nada, el ejecutor comprueba que todas las librerías devuelven el mismo texto.

| Caso          | Mensaje                                                           |
| ------------- | ----------------------------------------------------------------- |
| Lookup        | `Hello, world`                                                    |
| Interpolación | `Hello, {name}!`                                                  |
| Plural        | `{count, plural, =0 {No items} one {# item} other {# items}}`     |
| Anidado       | Un `select` sobre `gender` que contiene un `plural` sobre `count` |

Cada librería se usa como recomienda su documentación:

- **dialexjs**: `t("dictionary.key", values)` sobre cadenas ICU. `function messages` son funciones de TypeScript, `formatMessage` es el formateador por sí solo.
- **i18next**: su propia interpolación y claves de plural (`items_one`, `items_other`). No tiene `select` en línea, así que el caso anidado no se ejecuta.
- **intl-messageformat**: un formateador creado una vez por mensaje y reutilizado. `no cache` lo crea en cada llamada, que es lo que ocurre cuando una app no conserva la instancia.
- **@lingui/core**: mensajes compilados de antemano, como hace `lingui compile`.
- **Paraglide JS**: mensajes compilados a funciones por `paraglide-js compile` (`m.plural({ count })`), en el formato de mensajes predeterminado de inlang.
- **Intlayer**: contenido declarado en un archivo `.content.ts` y construido con `intlayer build`. El diccionario se lee una vez, como hace un componente con `useIntlayer`. `getIntlayer per call` lo lee en cada llamada.

## Rendimiento

Operaciones por segundo, más es mejor. Mediana de 7 rondas de 400 ms tras 300 ms de calentamiento.

Dialex está en verde. Las barras están a escala dentro de un gráfico, así que compara longitudes dentro de un gráfico, no entre gráficos.

<BenchmarkChart metric="plural" title="Plural" subtitle="operaciones por segundo, más es mejor" unsupported="no admitido" />

<BenchmarkChart metric="nested" title="Select y plural anidados" subtitle="operaciones por segundo, más es mejor" unsupported="no admitido" />

<BenchmarkChart metric="interpolation" title="Interpolación" subtitle="operaciones por segundo, más es mejor" unsupported="no admitido" />

<BenchmarkChart metric="lookup" title="Lookup" subtitle="operaciones por segundo, más es mejor" unsupported="no admitido" />

| Librería                        |     Lookup | Interpolación |     Plural | Select y plural anidados |
| ------------------------------- | ---------: | ------------: | ---------: | -----------------------: |
| dialexjs                        | 46,707,541 |    14,051,921 |  1,406,051 |                1,376,668 |
| dialexjs (function messages)    | 31,048,917 |    22,331,081 | 28,292,094 |               16,844,399 |
| dialexjs formatMessage          | 43,237,670 |    18,950,435 |  1,493,870 |                1,453,541 |
| i18next                         |    433,997 |       340,709 |    211,321 |                      n/a |
| intl-messageformat              | 21,672,973 |     4,179,803 |    441,800 |                  406,716 |
| intl-messageformat (no cache)   |    215,188 |       172,955 |     23,179 |                   19,389 |
| @lingui/core                    |  7,855,446 |     5,666,858 |    276,988 |                  132,382 |
| Paraglide JS                    | 23,386,911 |    16,831,905 |     89,624 |                   95,300 |
| Intlayer                        | 68,713,663 |     2,262,200 |  1,419,100 |                1,278,051 |
| Intlayer (getIntlayer per call) |    422,557 |       331,815 |    298,988 |                  292,948 |

Medido con Node v24.21.0 en un Intel Core i5-11400H, Linux x64, el 2026-10-12.

## Tamaño del bundle

El programa útil más pequeño de cada librería: crearla, cargar un mensaje plural y formatearlo. Empaquetado para el navegador con esbuild y minificado.

<BenchmarkChart metric="size" title="Tamaño del bundle" subtitle="bytes gzip, menos es mejor" />

| Programa                     | Minificado |     Gzip |   Brotli |
| ---------------------------- | ---------: | -------: | -------: |
| dialexjs (t)                 |    7,227 B |  2,739 B |  2,486 B |
| dialexjs/icu (formatMessage) |    6,479 B |  2,401 B |  2,175 B |
| dialexjs (function messages) |    7,268 B |  2,757 B |  2,491 B |
| i18next                      |   43,666 B | 14,043 B | 12,726 B |
| intl-messageformat           |   33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 |   10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |    4,824 B |  2,087 B |  1,869 B |
| Intlayer                     |   17,207 B |  4,901 B |  4,381 B |

Versiones: dialexjs 0.7.2 más los cambios de rendimiento del runtime (formato de mensajes compilado y formateadores `Intl` compartidos), i18next 26.4.3, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## Cómo leer estos números

- **Los plurales y los números son donde las librerías se diferencian.** Un plural necesita un `PluralRules` y un formateador de números. Crearlos en cada llamada es lento, así que Dialex mantiene uno por locale y opciones. Sin eso el caso plural midió unas 36.000 operaciones por segundo; con eso, unas 1.400.000.
- **Los mensajes de función se saltan el parser.** Un mensaje escrito como función de TypeScript lo compila TypeScript, así que plural y select cuestan lo mismo que una plantilla de cadena.
- **`t()` hace algo más que el formateador.** `dialexjs` divide la ruta con puntos y busca la clave antes de formatear, por eso `formatMessage` solo es más rápido en interpolación; en lookup los dos están dentro del margen de ruido.
- **i18next hace más por llamada.** Resuelve cadenas de fallback, namespaces y plugins en cada `t()`, que es el conjunto de funciones que pagas. El plugin ICU cambia sus números; este benchmark lo ejecuta sin él.
- **Paraglide JS es la más rápida de las demás librerías en interpolación.** Un mensaje con un valor se compila a una cadena de plantilla. Su código de plural crea un nuevo `Intl.PluralRules` en cada llamada (versión 2.27.0), que es el coste que Dialex eliminó, así que el plural es mucho más lento que su interpolación (unas 89.000 frente a 17 millones de operaciones por segundo).
- **El lookup de Intlayer es una lectura de propiedad.** Una cadena simple no requiere trabajo, por eso esa columna va muy por delante. Interpolación, plural y select pasan por funciones de nodo, y leer el diccionario en cada llamada es mucho más lento que leerlo una vez.
- **El tamaño es solo del runtime.** La cifra de Lingui es para mensajes compilados de antemano y no incluye su herramienta `lingui`. Dialex incluye su parser en el runtime, así que las cadenas ICU funcionan sin paso de compilación.
- **Paraglide JS e Intlayer se miden con sus propias herramientas de build.** La cifra de Paraglide es un mensaje compilado más su runtime. Intlayer necesita su plugin de bundler para ejecutarse en un navegador, así que se construye con `vite-intlayer` y `vanilla-intlayer`.

## Ejecútalo tú mismo

El benchmark está en `apps/benchmarks`. Compila los paquetes una vez y ejecuta:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Los resultados se escriben en `apps/benchmarks/results/` como JSON, con la versión de Node y la CPU en las que se midieron.
