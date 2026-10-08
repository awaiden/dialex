# Fetch API (Request)

`dialexjs/web` ermittelt das Locale aus einem Standard-`Request`. Verwende es in jedem Framework oder jeder Laufzeitumgebung, die dir einen liefert: Loader von React Router und Remix, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createI18nHandler } from "dialexjs/web";
import dictionaries from "./i18n.generated.js";

export const resolveI18n = createI18nHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveI18n(request);
```

| Ergebnis                 | Beschreibung                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `locale`                 | Das erkannte Locale                                                                                                          |
| `getDictionary(name)`    | Wörterbuchinhalt für dieses Locale, unter Beachtung der [Fallbacks](../guide/fallbacks.md)                                   |
| `t(path, ...args)`       | [Schlüsselpfad-Übersetzer](../guide/key-paths.md)                                                                            |
| `headers`                | `{ "Content-Language": locale }` (leer, wenn `setHeader` `false` ist)                                                        |
| `applyHeaders(response)` | Liefert die Antwort mit diesen Headern; kopiert sie, wenn ihre Header unveränderlich sind (zum Beispiel `Response.redirect`) |

Erkennungsreihenfolge und Optionen sind dieselben wie bei den anderen Adaptern: siehe [Locale-Erkennung](../guide/locale-detection.md).

## Rezepte

Sie zeigen, wie die Teile zusammenspielen. Nur `dialexjs/web` selbst wird von den Tests von Dialex abgedeckt; die folgende Framework-Anbindung wurde nicht in echten Apps ausgeführt, prüfe sie also anhand der aktuellen Dokumentation deines Frameworks.

### React Router / Remix

Loader erhalten den `Request`:

```ts
export async function loader({ request }: { request: Request }) {
  const { locale, getDictionary } = await resolveI18n(request);
  return { locale, title: getDictionary("home").title };
}
```

Gib die Daten an deine Komponente zurück und rendere sie dort. Umhülle die Antwort mit `applyHeaders`, wenn du sie selbst erstellst.

### TanStack Start und SolidStart

Lies den aktuellen Request mit dem Server-Helfer deines Frameworks und übergib ihn an `resolveI18n`. In SolidStart liefert zum Beispiel `getRequestEvent()?.request` den aktiven `Request`. Da der Aufruf einen Server-Kontext braucht, verwende ihn in Serverfunktionen oder Middleware, nicht in Client-Code.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const i18n = await resolveI18n(request);
    return i18n.applyHeaders(new Response(i18n.getDictionary("home").title));
  },
};
```
