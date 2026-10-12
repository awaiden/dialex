# Locale-Erkennung

Die Server-Adapter (Express, Fastify, Koa, Hono, Elysia, h3, Hapi, AdonisJS, NestJS, SvelteKit, Astro, tRPC und der Fetch-API-Handler) ermitteln das Locale der Anfrage aus mehreren Quellen, in dieser Reihenfolge:

1. Ein eigener Extraktor (`custom`)
2. Das erste Pfadsegment (`/tr/...`), wenn `usePath` wahr ist und `locales` konfiguriert ist (ohne `locales` wird der Pfad ignoriert, damit Segmente wie `/api` nie für ein Locale gehalten werden; Query-Strings und Fragmente werden vor dem Abgleich entfernt)
3. Query-Parameter (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. Der Header `Accept-Language`

Der erste Kandidat, der zu einem unterstützten Locale passt, gewinnt; andernfalls wird `defaultLocale` verwendet. `Accept-Language`-Einträge mit `q=0` werden ignoriert, und eine fehlerhafte Prozentkodierung in einem Cookie-Wert wird unverändert verwendet, statt einen Fehler auszulösen.

<a id="options"></a>

## Optionen

Alle Adapter akzeptieren diese Optionen (`LocaleResolverOptions`):

| Option          | Typ                                    | Standard             | Beschreibung                                                                                  |
| --------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Fallback-Locale                                                                               |
| `locales`       | `string[]`                             | —                    | Unterstützte Locales                                                                          |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Namen der Query-Parameter                                                                     |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie-Namen                                                                                  |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Zu lesender Header                                                                            |
| `usePath`       | `boolean`                              | `true`               | Erstes URL-Pfadsegment prüfen                                                                 |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Eigener Extraktor                                                                             |
| `config`        | `GeneratedConfig`                      | —                    | Die generierte Konfiguration. Füllt nicht gesetzte `defaultLocale`, `locales` und `fallbacks` |
| `fallbacks`     | `Record<string, string[]>`             | —                    | Explizite [Fallback-Ketten](./fallbacks.md)                                                   |

Darüber hinaus nimmt jeder Adapter `dictionaries` (eine Map oder ein Array von `defineDictionary`-Ergebnissen; ohne sie werden die über `defineDictionary` registrierten Wörterbücher verwendet) und `setHeader` (Standard `true`; sendet `Content-Language`). Explizit übergebene Optionen haben Vorrang vor der generierten `config`, und die generierte `config` hat Vorrang vor den Standardwerten. Jede Option, Adapter für Adapter, steht unter [Server-Adapter](../api/server-adapters.md).

## Abgleichsregeln

`matchLocale` unterscheidet nicht zwischen Groß- und Kleinschreibung und prüft der Reihe nach: exakte Übereinstimmung, Sprachpräfix des Kandidaten (`en-US` → `en`), dann ein unterstütztes Locale mit passendem Präfix (`en` → `en-US`).

## Antwort-Header

Mit `setHeader` (dem Standard) wird die aufgelöste Locale als `Content-Language` gesendet. Cacht ein CDN oder Proxy Seiten, die von `Accept-Language` abhängen, sende zusätzlich `Vary: Accept-Language`.

## Hilfsfunktionen

Intern teilen sich die Adapter `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` und `extractPathLocale`. Sie liegen in `src/resolver.ts` und gehören nicht zu den öffentlichen `exports` des Pakets.
