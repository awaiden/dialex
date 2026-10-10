# Locale-Erkennung

Die Server-Adapter (Express, Fastify, Koa, Hono, NestJS) ermitteln das Locale der Anfrage aus mehreren Quellen, in dieser Reihenfolge:

1. Ein eigener Extraktor (`custom`)
2. Das erste Pfadsegment (`/tr/...`), wenn `usePath` wahr ist und `locales` konfiguriert ist (ohne `locales` wird der Pfad ignoriert, damit Segmente wie `/api` nie für ein Locale gehalten werden; Query-Strings und Fragmente werden vor dem Abgleich entfernt)
3. Query-Parameter (`locale`, `lang`)
4. Cookie (`locale`, `lang`)
5. Der Header `Accept-Language`

Der erste Kandidat, der zu einem unterstützten Locale passt, gewinnt; andernfalls wird `defaultLocale` verwendet. `Accept-Language`-Einträge mit `q=0` werden ignoriert, und eine fehlerhafte Prozentkodierung in einem Cookie-Wert wird unverändert verwendet, statt einen Fehler auszulösen.

<a id="options"></a>

## Optionen

Alle Adapter akzeptieren diese Optionen (`LocaleResolverOptions`):

| Option          | Typ                                    | Standard             | Beschreibung                  |
| --------------- | -------------------------------------- | -------------------- | ----------------------------- |
| `defaultLocale` | `string`                               | `"en"`               | Fallback-Locale               |
| `locales`       | `string[]`                             | —                    | Unterstützte Locales          |
| `queryKeys`     | `string \| string[]`                   | `["locale", "lang"]` | Namen der Query-Parameter     |
| `cookieKeys`    | `string \| string[]`                   | `["locale", "lang"]` | Cookie-Namen                  |
| `headerKey`     | `string`                               | `"Accept-Language"`  | Zu lesender Header            |
| `usePath`       | `boolean`                              | `true`               | Erstes URL-Pfadsegment prüfen |
| `custom`        | `(req) => string \| null \| undefined` | —                    | Eigener Extraktor             |

Zusätzlich pro Adapter: `config` (die generierte Konfiguration; füllt `defaultLocale`, `locales` und `fallbacks`, wenn sie nicht gesetzt sind, und `{ ...dialex }` liefert sie), `dictionaries` (Map oder Array von `defineDictionary`-Ergebnissen; ohne Angabe wird die gebündelte Registry verwendet) und `setHeader` (Standard `true`, setzt `Content-Language`).

## Abgleichsregeln

`matchLocale` unterscheidet nicht zwischen Groß- und Kleinschreibung und prüft der Reihe nach: exakte Übereinstimmung, Sprachpräfix des Kandidaten (`en-US` → `en`), dann ein unterstütztes Locale mit passendem Präfix (`en` → `en-US`).

## Hilfsfunktionen

Intern teilen sich die Adapter `parseAcceptLanguage`, `matchLocale`, `resolveLocaleFromCandidates`, `extractCookieLocale` und `extractPathLocale`. Sie liegen in `src/resolver.ts` und gehören nicht zu den öffentlichen `exports` des Pakets.
