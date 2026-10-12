# API-Referenz

Alles, was Dialex exportiert, nach Einstiegspunkt. Jeder Einstiegspunkt ist ein Subpfad des Pakets `dialexjs` (`import { DialexProvider } from "dialexjs/react"`); die programmatische API der CLI ist `@dialexjs/cli/api`. Aus dem Paketstamm wird nur exportiert, was [Core](./core.md) auflistet, daher wird ein Framework-Adapter nur geladen, wenn du ihn importierst.

## Einstiegspunkte

| Einstiegspunkt                                                                           | Was er bereitstellt                                                     | Referenz                                                                |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `dialexjs`                                                                               | Konfiguration, Wörterbücher, `createT`, Formatierungshelfer, ICU, Typen | [Core](./core.md), [Formatierung](./formatting.md), [Typen](./types.md) |
| `dialexjs/icu`                                                                           | Parser und Formatter für ICU-Nachrichten ohne den Rest der Laufzeit     | [ICU-Nachrichten](./icu.md)                                             |
| `dialexjs/server`                                                                        | `getDictionary` und `getT` für Servercode                               | [Server-Adapter](./server-adapters.md#dialexjs-server)                  |
| `dialexjs/express`, `fastify`, `koa`, `hono`, `elysia`, `h3`, `hapi`, `adonis`, `nestjs` | Request-Middleware, Plugins und Module                                  | [Server-Adapter](./server-adapters.md)                                  |
| `dialexjs/sveltekit`, `astro`, `trpc`, `web`                                             | Hook, Middleware, Kontext und Fetch-API-Handler                         | [Server-Adapter](./server-adapters.md)                                  |
| `dialexjs/react`, `preact`, `solid`, `vue`, `nuxt`, `svelte`, `qwik`, `lit`, `angular`   | Provider, Hooks und Stores der Client-Frameworks                        | [Client-Frameworks](./client-frameworks.md)                             |
| `dialexjs/react-native`                                                                  | `DialexProvider` mit Gerätesprachen und Speicher                        | [Client-Frameworks](./client-frameworks.md#dialexjs-react-native)       |
| `dialexjs/next/middleware`, `dialexjs/next/link`                                         | Next.js-Middleware und `DialexLink`                                     | [Client-Frameworks](./client-frameworks.md#next-js)                     |
| `dialexjs/routing`                                                                       | Pfade mit Locale-Präfix, `hreflang`-Links und Sitemap-Einträge          | [Routing](./routing.md)                                                 |
| `dialexjs/testing`, `dialexjs/testing/react`, `dialexjs/testing/vue`                     | Testkontexte, Mock-Requests und Test-Provider                           | [Testen](./testing.md)                                                  |
| `@dialexjs/cli/api`                                                                      | Projektanalyse und die Helfer zum Bearbeiten von Wörterbüchern          | [CLI-API](./cli-api.md)                                                 |

## Konventionen

- **Typisierte Namen und Pfade.** `DictionaryRegistry`, `Register` und `MessageArguments` sind leere Interfaces, die `dialex generate` in `dialex-env.d.ts` ergänzt. Bis es gelaufen ist, sind Wörterbuchnamen und `t()`-Pfade einfache `string`; danach werden sie vervollständigt und geprüft. Siehe [Typen](./types.md).
- **Das generierte `dialex`-Objekt.** Provider, Adapter und `createDialexServer` akzeptieren `{ ...dialex }` aus `dialex.generated.ts`. Es enthält die Wörterbücher, die clientsichere Konfiguration und, mit Lazy Loading, die Loader; die Locale-Einstellungen stehen also nur einmal in `dialex.config.ts`.
- **Fehlerfälle.** Ein fehlendes Wörterbuch, eine fehlende Locale oder ein fehlender Pfad wirft im Produktivcode nie: Es wird mit dem Präfix `[dialex]` per `console.warn` gemeldet und ein leeres Objekt oder der Pfad selbst zurückgegeben. Ungültige ICU-Nachrichten werden von `t()` gemeldet und unverändert zurückgegeben; `formatMessage` wirft. Hooks, die einen Provider brauchen, werfen, wenn er fehlt.
- **Stabilität.** Dialex ist unter 1.0. Breaking Changes erscheinen in Minor-Releases und stehen im [Changelog](../guide/changelog.md).
