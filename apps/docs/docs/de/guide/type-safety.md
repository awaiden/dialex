# Typsicherheit

`dialex generate` schreibt `src/dialex-env.d.ts` neben `src/dialex.generated.ts`. Es erweitert vier Interfaces:

```ts
declare module "dialexjs" {
  export interface Register {
    locales: "en" | "tr";
  }
  export interface MessageArguments {
    "cart.items": { count: number };
  }
}

declare module "dialexjs/react" {
  export interface DictionaryRegistry extends Record<"home" /* ... */> {}
}

declare module "dialexjs/server" {
  export interface DictionaryRegistry extends Record<"home" /* ... */> {}
}
```

Das Ergebnis:

- `Locales` wird auf deine konfigurierten Locales eingeengt (benötigt `locales` in der Konfiguration, sonst bleibt es `string`).
- `getDictionary("home")`, `useDictionary("home")` und `req.getDictionary("home")` vervollständigen Wörterbuchnamen automatisch und liefern den exakten Inhaltstyp, einschließlich Funktionssignaturen wie `greeting(name: string)`.
- Unbekannte Namen lassen sich weiterhin kompilieren (der Schlüsseltyp ist `keyof DictionaryRegistry | (string & {})`) und liefern `any`.
- `t("cart.items", { count: 3 })` wird gegen die ICU-Argumente der Nachricht (`MessageArguments`) geprüft: Ein fehlendes, falsch geschriebenes oder falsch typisiertes Argument ist ein Kompilierfehler. Siehe [ICU-Nachrichten](./icu.md#types).

Stelle sicher, dass `src/dialex-env.d.ts` von deiner `tsconfig.json` erfasst wird.
