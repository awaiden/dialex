# Seguridad de tipos

`dialex generate` escribe `src/dialex-env.d.ts` junto a `src/dialex.generated.ts`. Amplía cuatro interfaces:

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

El resultado:

- `Locales` se reduce a tus locales configurados (requiere `locales` en la configuración; si no, sigue siendo `string`).
- `getDictionary("home")`, `useDictionary("home")` y `req.getDictionary("home")` autocompletan los nombres de diccionario y devuelven el tipo de contenido exacto, incluidas las firmas de funciones como `greeting(name: string)`.
- Los nombres desconocidos siguen compilando (el tipo de la clave es `keyof DictionaryRegistry | (string & {})`) y devuelven `any`.
- `t("cart.items", { count: 3 })` se comprueba con los argumentos ICU del mensaje (`MessageArguments`): un argumento ausente, mal escrito o de tipo incorrecto es un error de compilación. Consulta [Mensajes ICU](./icu.md#types).

Asegúrate de que `tsconfig.json` incluya `src/dialex-env.d.ts`.
