# Referencia de la API

Todo lo que exporta Dialex, por punto de entrada. Cada punto de entrada es una subruta del paquete `dialexjs` (`import { DialexProvider } from "dialexjs/react"`); la API programática de la CLI es `@dialexjs/cli/api`. De la raíz del paquete solo se exporta lo que lista [Core](./core.md), así que un adaptador de framework solo se carga cuando lo importas.

## Puntos de entrada

| Punto de entrada                                                                         | Qué ofrece                                                                | Referencia                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `dialexjs`                                                                               | Configuración, diccionarios, `createT`, ayudantes de formato, ICU y tipos | [Core](./core.md), [Formato](./formatting.md), [Tipos](./types.md)    |
| `dialexjs/icu`                                                                           | El analizador y formateador de mensajes ICU sin el resto del runtime      | [Mensajes ICU](./icu.md)                                              |
| `dialexjs/server`                                                                        | `getDictionary` y `getT` para código de servidor                          | [Adaptadores de servidor](./server-adapters.md#dialexjs-server)       |
| `dialexjs/express`, `fastify`, `koa`, `hono`, `elysia`, `h3`, `hapi`, `adonis`, `nestjs` | Middleware de peticiones, plugins y módulos                               | [Adaptadores de servidor](./server-adapters.md)                       |
| `dialexjs/sveltekit`, `astro`, `trpc`, `web`                                             | Hook, middleware, contexto y manejador de la API Fetch                    | [Adaptadores de servidor](./server-adapters.md)                       |
| `dialexjs/react`, `preact`, `solid`, `vue`, `nuxt`, `svelte`, `qwik`, `lit`, `angular`   | Proveedores, hooks y stores de los frameworks de cliente                  | [Frameworks de cliente](./client-frameworks.md)                       |
| `dialexjs/react-native`                                                                  | `DialexProvider` con idiomas del dispositivo y almacenamiento             | [Frameworks de cliente](./client-frameworks.md#dialexjs-react-native) |
| `dialexjs/next/middleware`, `dialexjs/next/link`                                         | Middleware de Next.js y `DialexLink`                                      | [Frameworks de cliente](./client-frameworks.md#next-js)               |
| `dialexjs/routing`                                                                       | Rutas con prefijo de locale, enlaces `hreflang` y entradas de sitemap     | [Enrutamiento](./routing.md)                                          |
| `dialexjs/testing`, `dialexjs/testing/react`, `dialexjs/testing/vue`                     | Contextos de prueba, peticiones simuladas y proveedores de prueba         | [Pruebas](./testing.md)                                               |
| `@dialexjs/cli/api`                                                                      | Análisis del proyecto y ayudantes para editar diccionarios                | [API de la CLI](./cli-api.md)                                         |

## Convenciones

- **Nombres y rutas tipados.** `DictionaryRegistry`, `Register` y `MessageArguments` son interfaces vacías que `dialex generate` amplía en `dialex-env.d.ts`. Hasta que se ejecuta, los nombres de diccionario y las rutas de `t()` son `string` sin más; después se autocompletan y se comprueban. Consulta [Tipos](./types.md).
- **El objeto `dialex` generado.** Los proveedores, los adaptadores y `createDialexServer` aceptan `{ ...dialex }` de `dialex.generated.ts`. Lleva los diccionarios, la configuración segura para el cliente y, con carga diferida, los loaders, así que los ajustes de locale se escriben una vez, en `dialex.config.ts`.
- **Fallos.** Un diccionario, locale o ruta que falta nunca lanza una excepción en código de producción: registra un `console.warn` con el prefijo `[dialex]` y devuelve un objeto vacío o la propia ruta. `t()` informa de los mensajes ICU no válidos y los devuelve sin cambios; `formatMessage` lanza. Los hooks que necesitan un proveedor lanzan si falta.
- **Estabilidad.** Dialex está por debajo de 1.0. Los cambios incompatibles salen en versiones menores y figuran en el [changelog](../guide/changelog.md).
