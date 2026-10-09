# Fetch API (Request)

`dialexjs/web` ermittelt das Locale aus einem Standard-`Request`. Verwende es in jedem Framework oder jeder Laufzeitumgebung, die dir einen liefert: Loader von React Router und Remix, TanStack Start, SolidStart, Cloudflare Workers, Deno, Bun.

```ts
import { createDialexHandler } from "dialexjs/web";
import dictionaries from "./dialex.generated.js";

export const resolveDialex = createDialexHandler({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

const { locale, getDictionary, t, headers, applyHeaders } = await resolveDialex(request);
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
  const { locale, getDictionary } = await resolveDialex(request);
  return { locale, title: getDictionary("home").title };
}
```

Gib die Daten an deine Komponente zurück und rendere sie dort. Umhülle die Antwort mit `applyHeaders`, wenn du sie selbst erstellst.

### TanStack Start und SolidStart

Lies den aktuellen Request mit dem Server-Helfer deines Frameworks und übergib ihn an `resolveDialex`. In SolidStart liefert zum Beispiel `getRequestEvent()?.request` den aktiven `Request`. Da der Aufruf einen Server-Kontext braucht, verwende ihn in Serverfunktionen oder Middleware, nicht in Client-Code. In TanStack Start rufst du `getRequest()` aus `@tanstack/react-start/server` innerhalb eines `createServerFn`-Handlers auf. Die App [`examples/tanstack`](https://github.com/awaiden/dialex/tree/main/examples/tanstack) macht das im `beforeLoad` der Root-Route und übergibt das Ergebnis als `initialLocale` an `DialexProvider`; anders als die übrigen Rezepte hier läuft sie in einer echten App.

### Workers, Deno, Bun

```ts
export default {
  async fetch(request: Request) {
    const dialex = await resolveDialex(request);
    return dialex.applyHeaders(new Response(dialex.getDictionary("home").title));
  },
};
```
