# Comparación

Cómo se diferencia Dialex de las librerías con las que más se compara: [i18next](https://www.i18next.com), [FormatJS](https://formatjs.github.io) (`react-intl` e `intl-messageformat`) [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) e [Intlayer](https://intlayer.org). Todas son buenas librerías, y la adecuada depende de cómo tu equipo escribe y traduce el texto.

Para números de velocidad y tamaño, consulta [Benchmarks](./benchmarks.md).

## De un vistazo

| Pregunta                | Dialex                                         | i18next                                          | FormatJS                              | Lingui                                                               |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------- |
| Dónde vive el texto     | Diccionarios de TypeScript junto al código     | Recursos JSON, cargados por namespace            | Mensajes en el código, más catálogos  | Mensajes en el código, extraídos a catálogos                         |
| Sintaxis de mensajes    | ICU MessageFormat, o una función de TypeScript | Su propio `{{value}}` y claves de plural         | ICU MessageFormat                     | ICU MessageFormat                                                    |
| Claves tipadas          | Generadas a partir de tus diccionarios         | Mediante declaraciones de tipos de los recursos  | Los ids de mensaje son cadenas        | Sin claves: el texto fuente es el id                                 |
| Argumentos ICU tipados  | Generados a partir de cada mensaje             | No forman parte de los tipos de clave            | No por defecto                        | Los valores vienen de la plantilla, así que TypeScript los comprueba |
| Traducciones que faltan | `dialex check` hace fallar el build            | Se informa en tiempo de ejecución, con fallbacks | Se informa mediante `onError`         | Las cuenta `lingui extract`; `lingui compile --strict` falla         |
| Paso de extracción      | Ninguno: los diccionarios son la fuente        | Herramientas opcionales                          | `formatjs extract`                    | `lingui extract`                                                     |
| Entrega a traductores   | Exportación e importación en JSON, CSV y XLIFF | JSON, con muchos servicios que se integran       | JSON, en varios formatos de proveedor | Catálogos PO y JSON                                                  |
| Carga diferida          | Por diccionario o por locale, generada         | Backends y namespaces                            | Tus propios imports dinámicos         | Tus propios imports dinámicos                                        |

Las celdas describen los valores por defecto documentados de cada librería. Todas se pueden ampliar con plugins o con tu propio código.

## Dialex e i18next

i18next es la librería de i18n más utilizada para JavaScript, con un gran ecosistema de backends, detectores de idioma y enlaces con frameworks. Guarda las traducciones como recursos JSON y ofrece funciones en tiempo de ejecución como namespaces, fallbacks y plugins.

Dialex hace un intercambio distinto. Los diccionarios son TypeScript, compilados en un registro tipado, así que una clave o un argumento equivocado es un error de tipos, y un locale que falta hace fallar `dialex check` antes de publicar. No hay carga de recursos en tiempo de ejecución que configurar; con [carga diferida](./lazy-loading.md) un diccionario es un módulo dividido en el bundle.

Elige i18next cuando necesites su ecosistema de plugins, backends que obtengan traducciones en tiempo de ejecución o un runtime que no esté ligado a TypeScript. Elige Dialex cuando quieras que el compilador vigile tu texto.

## Dialex y FormatJS

FormatJS es la implementación de referencia de ICU MessageFormat para JavaScript, y `react-intl` construye componentes de React sobre ella. Los mensajes se definen en el código con `defineMessages` o `formatMessage`, se extraen con la CLI `formatjs` y pueden precompilarse.

Dialex usa la misma sintaxis de mensajes, así que los mensajes ICU se trasladan tal cual. La diferencia es el flujo de trabajo alrededor: Dialex no necesita un paso de extracción, porque el diccionario es la fuente, y genera tipos para claves y argumentos. El runtime también es más pequeño, como se muestra en [Benchmarks](./benchmarks.md).

Elige FormatJS cuando quieras la implementación estándar y sus componentes de React, o cuando tu proceso de traducción se base en `formatjs extract`.

## Dialex y Lingui

Lingui mantiene el mensaje en el código fuente (macros `t` y `Trans`), extrae catálogos a PO o JSON y los compila a un runtime pequeño. El resultado es un bundle muy pequeño y un estilo de escritura en el que el texto en inglés se escribe en el componente.

Dialex mantiene el texto en diccionarios, de modo que una clave nombra su propósito y cada locale está junto a los demás en el archivo. Ambos enfoques usan ICU MessageFormat.

Elige Lingui cuando prefieras escribir los mensajes en línea y tengas un proceso de traducción basado en PO. Elige Dialex cuando prefieras claves con nombre y quieras que las compruebe el sistema de tipos.

## Paraglide JS e Intlayer de un vistazo

Dos librerías que también trabajan en tiempo de compilación, junto a Dialex:

| Pregunta                | Dialex                                         | Paraglide JS                                                                   | Intlayer                                                    |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Dónde vive el texto     | Diccionarios de TypeScript junto al código     | Archivos de mensajes JSON por locale                                           | Archivos `.content` junto a los componentes                 |
| Sintaxis de mensajes    | ICU MessageFormat, o una función de TypeScript | Formato inlang; ICU MessageFormat 1 e i18next mediante plugin                  | Nodos propios (`t`, `plural`, `enu`, `select`), o ICU       |
| Claves tipadas          | Generadas a partir de tus diccionarios         | Cada mensaje es una función generada                                           | Mediante un tipo `Dictionary` en cada declaración           |
| Argumentos ICU tipados  | Generados a partir de cada mensaje             | Los parámetros de las funciones generadas están tipados                        | No se trata en su documentación                             |
| Traducciones que faltan | `dialex check` hace fallar el build            | La CLI de inlang comprueba las traducciones en CI                              | `intlayer content test` las comprueba                       |
| Paso de extracción      | Ninguno: los diccionarios son la fuente        | Ninguno: los mensajes se escriben en los archivos JSON                         | `intlayer extract` mueve cadenas fuera de los componentes   |
| Entrega a traductores   | Exportación e importación en JSON, CSV y XLIFF | Editor Fink para no desarrolladores; importación y exportación mediante plugin | CMS y editor, `fill` con IA, archivos JSON y YAML           |
| Carga diferida          | Por diccionario o por locale, generada         | El bundler elimina los mensajes no usados                                      | `importMode`: `static`, `dynamic` o `fetch` por diccionario |

## Dialex y Paraglide JS

[Paraglide JS](https://paraglidejs.com) es un compilador del proyecto inlang. Los mensajes viven en archivos JSON y el compilador convierte cada uno en una función (`m.greeting({ name })`) con parámetros tipados, de modo que un bundler puede descartar los mensajes que no usas. El formato de mensajes es intercambiable: el predeterminado es el formato inlang, y los plugins añaden ICU MessageFormat 1 y archivos de i18next.

Dialex también genera tipos a partir de tus mensajes, pero mantiene el texto de una funcionalidad junto en un diccionario, con todos los locales uno al lado de otro, y ejecuta las cadenas ICU en un runtime pequeño. Las funciones por mensaje de Paraglide dan el tree-shaking más fino; la [carga diferida](./lazy-loading.md) de Dialex divide por diccionario o por locale.

Elige Paraglide JS cuando el tree-shaking por mensaje sea lo más importante, o cuando quieras las herramientas de editor de inlang. Elige Dialex cuando prefieras diccionarios agrupados por funcionalidad, cadenas ICU y mensajes de función en un mismo archivo, y una comprobación de paridad entre locales.

## Dialex e Intlayer

[Intlayer](https://intlayer.org) declara el contenido en archivos `.content` junto a cada componente (TypeScript, JSON, YAML o Markdown), cada uno con una `key`, y los compila en diccionarios. Alrededor ofrece un CMS y un editor, `fill` para completar traducciones con IA, `extract` para mover cadenas fuera de los componentes y `content test` para encontrar traducciones que faltan.

Dialex también guarda el texto en archivos `*.content.ts` junto al código, pero sigue siendo una librería y una herramienta de línea de comandos: los mensajes son cadenas ICU simples o funciones, y el único servicio con el que habla es el que elijas para `dialex translate`.

Elige Intlayer cuando quieras un editor para no desarrolladores, contenido por componente con sus propios tipos de nodo y relleno con IA integrado en el flujo. Elige Dialex cuando quieras ICU MessageFormat estándar y ningún servicio alojado.

## Cuándo Dialex no es la opción adecuada

- Necesitas cargar o cambiar traducciones en tiempo de ejecución desde un servicio, sin desplegar.
- Tus traductores trabajan en una herramienta que solo lee archivos PO y no quieres un paso de conversión. Dialex exporta JSON, CSV y XLIFF.
- Tu proyecto es JavaScript puro. El principal valor de Dialex son los tipos que genera.
- Dependes de un plugin del ecosistema que solo ofrecen i18next, FormatJS o Lingui.

## Pasar a Dialex

- Conserva tus mensajes ICU tal cual; la sintaxis es la misma.
- Convierte cada namespace o catálogo en un archivo `defineDictionary` y deja que `dialex check` encuentre las claves que difieren entre locales.
- Importa las traducciones existentes con [`dialex import`](../cli/import.md) desde JSON, CSV o XLIFF.
