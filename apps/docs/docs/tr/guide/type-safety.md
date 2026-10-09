# Tip Güvenliği

`dialex generate` (ayrıca Vite eklentisi ve Next.js için `withDialex`) `src/dialex-env.d.ts` dosyasını yazar. Bu dosya üç arayüzü genişletir:

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

Sonuç:

- `Locales`, yapılandırdığınız yerel ayarlara daralır (yapılandırmada `locales` gerekir; aksi halde `string` olarak kalır).
- `getDictionary("home")`, `useDictionary("home")` ve `req.getDictionary("home")` sözlük adlarını otomatik tamamlar ve `greeting(name: string)` gibi fonksiyon imzaları dahil tam içerik tipini döndürür.
- Bilinmeyen adlar yine de derlenir (anahtar tipi `keyof DictionaryRegistry | (string & {})` olur) ve `any` döndürür.

`src/dialex-env.d.ts` dosyasının `tsconfig.json` tarafından kapsandığından emin olun.
