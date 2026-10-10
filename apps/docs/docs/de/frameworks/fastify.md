# Fastify

```ts
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

`dialexPlugin` ist mit `fastify-plugin` umhüllt (Name `dialex-fastify`, Fastify `>=4`), sodass die Request-Dekoratoren über Kapselungskontexte hinweg sichtbar sind. Es ist außerdem der Default-Export. Alle [Optionen der Locale-Erkennung](../guide/locale-detection.md#options) gelten.

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an den Adapter. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Registriere das Plugin einmal auf der Wurzelinstanz, vor deinen Routen und anderen Plugins, damit `req.locale` und `req.getDictionary` überall vorhanden sind.
- Lies das vom Adapter ermittelte Locale, statt `Accept-Language` oder Cookies selbst zu parsen, damit jede Route mit der Middleware übereinstimmt.

## Fehlerbehebung

- **`req.getDictionary` ist in einer Route undefiniert**: Die Route wurde vor dem Plugin registriert. `await app.register(dialexPlugin, { ...dialex })` muss zuerst abgeschlossen sein.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **Immer das Standard-Locale**: Keine Quelle passte zur Anfrage. Die Reihenfolge ist URL-Präfix (`/tr/...`), `?locale=` oder `?lang=`, Cookie `locale`, dann `Accept-Language`. Prüfe, was der Client tatsächlich sendet.
