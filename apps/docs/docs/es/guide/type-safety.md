# Seguridad de tipos

`dialex generate` (y el plugin de Vite, y `withI18n` para Next.js) escribe `src/dialex-env.d.ts`. Este archivo amplía tres interfaces:

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

El resultado:

- `Locales` se reduce a tus locales configurados (requiere `locales` en la configuración; si no, sigue siendo `string`).
- `getDictionary("home")`, `useDictionary("home")` y `req.getDictionary("home")` autocompletan los nombres de diccionario y devuelven el tipo de contenido exacto, incluidas las firmas de funciones como `greeting(name: string)`.
- Los nombres desconocidos siguen compilando (el tipo de la clave es `keyof DictionaryRegistry | (string & {})`) y devuelven `any`.

Asegúrate de que `tsconfig.json` incluya `src/dialex-env.d.ts`.
