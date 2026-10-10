# Locale Detection

The server adapters (Express, Fastify, Koa, Hono, NestJS) resolve the request locale from several sources, in this order:

1. A custom extractor (`custom`)
2. The first path segment (`/tr/...`), when `usePath` is true and `locales` is configured (without `locales`, the path is ignored so segments like `/api` are never mistaken for a locale; query strings and fragments are stripped before matching)
3. Query parameter (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. The `Accept-Language` header

The first candidate that matches a supported locale wins, otherwise `defaultLocale` is used. `Accept-Language` entries with `q=0` are ignored, and a malformed percent-encoding in a cookie value is used as-is instead of raising an error.

## Options

All adapters accept these (`LocaleResolverOptions`):

| Option          | Type                                   | Default              | Description                      |
| --------------- | -------------------------------------- | -------------------- | -------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Fallback locale                  |
| `locales`       | `string[]`                             | —                    | Supported locales                |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Query parameter names            |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie names                     |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Header to read                   |
| `usePath`       | `boolean`                              | `true`               | Check the first URL path segment |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Custom extractor                 |

Plus, per adapter: `config` (the generated config; fills `defaultLocale`, `locales` and `fallbacks` when they are not set, and `{ ...dialex }` provides it), `dictionaries` (map or array of `defineDictionary` results; falls back to the bundled registry) and `setHeader` (default `true`, sets `Content-Language`).

## Matching rules

`matchLocale` is case-insensitive and tries, in order: exact match, language prefix of the candidate (`en-US` → `en`), then supported locale with matching prefix (`en` → `en-US`).

## Helpers

Internally the adapters share `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale`, and `extractPathLocale`. These live in `src/resolver.ts` and are not part of the package's public `exports`.
