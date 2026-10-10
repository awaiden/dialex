# Detección de locale

Los adaptadores de servidor (Express, Fastify, Koa, Hono, NestJS) resuelven el locale de la petición a partir de varias fuentes, en este orden:

1. Un extractor personalizado (`custom`)
2. El primer segmento de la ruta (`/tr/...`), cuando `usePath` es verdadero y `locales` está configurado (sin `locales`, la ruta se ignora para que segmentos como `/api` nunca se confundan con un locale; las cadenas de consulta y los fragmentos se eliminan antes de comparar)
3. Parámetro de consulta (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. La cabecera `Accept-Language`

Gana el primer candidato que coincide con un locale compatible; si no hay ninguno, se usa `defaultLocale`. Las entradas de `Accept-Language` con `q=0` se ignoran, y una codificación porcentual mal formada en el valor de una cookie se usa tal cual en lugar de provocar un error.

<a id="options"></a>

## Opciones

Todos los adaptadores aceptan estas opciones (`LocaleResolverOptions`):

| Opción          | Tipo                                   | Valor por defecto    | Descripción                                       |
| --------------- | -------------------------------------- | -------------------- | ------------------------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Locale de reserva                                 |
| `locales`       | `string[]`                             | —                    | Locales compatibles                               |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Nombres de los parámetros de consulta             |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Nombres de las cookies                            |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Cabecera que se lee                               |
| `usePath`       | `boolean`                              | `true`               | Comprobar el primer segmento de la ruta de la URL |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Extractor personalizado                           |

Además, por adaptador: `config` (la configuración generada; rellena `defaultLocale`, `locales` y `fallbacks` cuando no se indican, y `{ ...dialex }` la aporta), `dictionaries` (mapa o array de resultados de `defineDictionary`; si se omite, usa los diccionarios registrados con `defineDictionary`) y `setHeader` (por defecto `true`, establece `Content-Language`).

## Reglas de coincidencia

`matchLocale` no distingue mayúsculas de minúsculas y prueba, por orden: coincidencia exacta, prefijo de idioma del candidato (`en-US` → `en`) y, por último, un locale compatible cuyo prefijo coincida (`en` → `en-US`).

## Funciones auxiliares

Internamente los adaptadores comparten `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` y `extractPathLocale`. Están en `src/resolver.ts` y no forman parte de los `exports` públicos del paquete.
