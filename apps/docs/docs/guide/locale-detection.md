# Locale Detection

The server adapters (Express, Fastify, Koa, Hono, Elysia, h3, Hapi, AdonisJS, NestJS, SvelteKit, Astro, tRPC and the Fetch API handler) resolve the request locale from several sources, in this order:

1. A custom extractor (`custom`)
2. The first path segment (`/tr/...`), when `usePath` is true and `locales` is configured (without `locales`, the path is ignored so segments like `/api` are never mistaken for a locale; query strings and fragments are stripped before matching)
3. Query parameter (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. The `Accept-Language` header

The first candidate that matches a supported locale wins, otherwise `defaultLocale` is used. `Accept-Language` entries with `q=0` are ignored, and a malformed percent-encoding in a cookie value is used as-is instead of raising an error.

## Options

All adapters accept these (`LocaleResolverOptions`):

| Option          | Type                                   | Default              | Description                                                                             |
| --------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Fallback locale                                                                         |
| `locales`       | `string[]`                             | —                    | Supported locales                                                                       |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Query parameter names                                                                   |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie names                                                                            |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Header to read                                                                          |
| `usePath`       | `boolean`                              | `true`               | Check the first URL path segment                                                        |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Custom extractor                                                                        |
| `config`        | `GeneratedConfig`                      | —                    | The generated config. Fills `defaultLocale`, `locales` and `fallbacks` that are not set |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Explicit [fallback chains](./fallbacks.md)                                              |

Besides these, every adapter takes `dictionaries` (a map or an array of `defineDictionary` results; without it the dictionaries registered by `defineDictionary` are used) and `setHeader` (default `true`; sends `Content-Language`). Options you pass explicitly win over the generated `config`, and the generated `config` wins over the defaults. Every option, adapter by adapter, is on [Server adapters](../api/server-adapters.md).

## Matching rules

`matchLocale` is case-insensitive and tries, in order: exact match, language prefix of the candidate (`en-US` → `en`), then supported locale with matching prefix (`en` → `en-US`).

## Response header

With `setHeader` (the default) the resolved locale is sent as `Content-Language`. If a CDN or proxy caches pages that depend on `Accept-Language`, also send `Vary: Accept-Language`.

## Helpers

Internally the adapters share `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale`, and `extractPathLocale`. These live in `src/core/resolver.ts` and are not part of the package's public `exports`.
