# Typsicherheit

`dialex generate` (sowie das Vite-Plugin und `withDialex` für Next.js) schreibt `src/dialex-env.d.ts`. Die Datei erweitert drei Interfaces:

```ts
declare module "dialexjs" {
  export interface Register {
    locales: "en" | "tr";
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

Stelle sicher, dass `src/dialex-env.d.ts` von deiner `tsconfig.json` erfasst wird.
