# Detección de locale

Los adaptadores de servidor (Express, Fastify, Koa, Hono, Elysia, h3, Hapi, AdonisJS, NestJS, SvelteKit, Astro, tRPC y el manejador de la API Fetch) resuelven el locale de la petición a partir de varias fuentes, en este orden:

1. Un extractor personalizado (`custom`)
2. El primer segmento de la ruta (`/tr/...`), cuando `usePath` es verdadero y `locales` está configurado (sin `locales`, la ruta se ignora para que segmentos como `/api` nunca se confundan con un locale; las cadenas de consulta y los fragmentos se eliminan antes de comparar)
3. Parámetro de consulta (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. La cabecera `Accept-Language`

Gana el primer candidato que coincide con un locale compatible; si no hay ninguno, se usa `defaultLocale`. Las entradas de `Accept-Language` con `q=0` se ignoran, y una codificación porcentual mal formada en el valor de una cookie se usa tal cual en lugar de provocar un error.

<a id="options"></a>

## Opciones

Todos los adaptadores aceptan estas opciones (`LocaleResolverOptions`):

| Opción          | Tipo                                   | Valor por defecto    | Descripción                                                                                        |
| --------------- | -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Locale de reserva                                                                                  |
| `locales`       | `string[]`                             | —                    | Locales compatibles                                                                                |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Nombres de los parámetros de consulta                                                              |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Nombres de las cookies                                                                             |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Cabecera que se lee                                                                                |
| `usePath`       | `boolean`                              | `true`               | Comprobar el primer segmento de la ruta de la URL                                                  |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Extractor personalizado                                                                            |
| `config`        | `GeneratedConfig`                      | —                    | La configuración generada. Rellena `defaultLocale`, `locales` y `fallbacks` que no estén definidos |
| `fallbacks`     | `Record<string, string[]>`             | —                    | [Cadenas de fallback](./fallbacks.md) explícitas                                                   |

Además, cada adaptador acepta `dictionaries` (un mapa o un array de resultados de `defineDictionary`; sin él se usan los diccionarios registrados por `defineDictionary`) y `setHeader` (por defecto `true`; envía `Content-Language`). Las opciones que pasas explícitamente prevalecen sobre la `config` generada, y la `config` generada prevalece sobre los valores por defecto. Cada opción, adaptador por adaptador, está en [Adaptadores de servidor](../api/server-adapters.md).

## Reglas de coincidencia

`matchLocale` no distingue mayúsculas de minúsculas y prueba, por orden: coincidencia exacta, prefijo de idioma del candidato (`en-US` → `en`) y, por último, un locale compatible cuyo prefijo coincida (`en` → `en-US`).

## Cabecera de respuesta

Con `setHeader` (el valor por defecto) el locale resuelto se envía como `Content-Language`. Si una CDN o proxy cachea páginas que dependen de `Accept-Language`, envía también `Vary: Accept-Language`.

## Funciones auxiliares

Internamente los adaptadores comparten `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` y `extractPathLocale`. Están en `src/core/resolver.ts` y no forman parte de los `exports` públicos del paquete.
