# tRPC

`dialexjs/trpc` legt das Locale und die Wörterbücher in den tRPC-Kontext, sodass jede Prozedur ihre eigenen Fehler und Meldungen übersetzen kann. Es hat keine Abhängigkeit von `@trpc/server`; es liest die Anfrage, die dein Adapter ohnehin an `createContext` übergibt. Die Erkennung per Header, Cookie und Query-String funktioniert mit jedem Adapter; beim Express- und beim Standalone-Adapter ist `req.url` relativ zum Mount-Pfad, daher wird ein Locale-Präfix im URL-Pfad nur gesehen, wenn die vollständige URL in `url` übergeben wird.

```ts
// src/trpc.ts
import { initTRPC } from "@trpc/server";
import { createDialexContext } from "dialexjs/trpc";

import { dialex } from "./dialex.generated.js";

const resolveDialex = createDialexContext({ ...dialex });

export const createContext = ({ req }: { req: Request }) => ({
  ...resolveDialex(req),
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

export const appRouter = t.router({
  greeting: t.procedure.query(({ ctx }) => {
    const dict = ctx.getDictionary("home");
    return { title: dict.title, locale: ctx.locale };
  }),
});
```

`resolveDialex(request)` gibt `{ locale, getDictionary, t }` zurück. Übernimm es per Spread in deinen eigenen Kontext, neben Sitzung oder Datenbank-Handle.

## Formen der Anfrage

Das Argument kann eine Fetch-`Request` sein, wie sie der Fetch-, der Next.js- und der Cloudflare-Adapter übergeben, oder ein beliebiges Objekt mit `headers` und optional `url`, wie es der Express- und der Standalone-Adapter übergeben:

```ts
// Express adapter
createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({ ...resolveDialex(req) }),
});
```

## Bewährte Vorgehensweisen

- Übergib `{ ...dialex }` aus `dialex.generated.ts` an `createDialexContext`. Es enthält die Wörterbücher und die Locale-Konfiguration, sodass `defaultLocale`, `locales` und `fallbacks` nur einmal in `dialex.config.ts` stehen.
- Erzeuge `resolveDialex` einmal auf Modulebene und rufe es pro Anfrage in `createContext` auf.
- Verwende `ctx.getDictionary("errors")`, um die Meldung eines `TRPCError` zu bauen, damit Clients Text in ihrer eigenen Sprache erhalten.
- tRPC-Aufrufe kommen oft aus deinem eigenen Frontend. Sende das Locale als Cookie `locale` oder als Header `Accept-Language`, was der Browser selbst erledigt, statt als Eingabe jeder Prozedur.

## Fehlerbehebung

- **Das Locale ist immer das Standard-Locale**: Beim Express-Adapter ist `req.url` relativ zum Mount-Pfad, daher wird ein Locale-Präfix im Pfad nicht gesehen. Verwende stattdessen das Cookie oder `Accept-Language`, oder übergib die ursprüngliche URL in `url`.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
- **`ctx.getDictionary` fehlt in einer Prozedur**: `createContext` gibt das Ergebnis von `resolveDialex` nicht zurück. Übernimm es per Spread in das Objekt, das du zurückgibst.
