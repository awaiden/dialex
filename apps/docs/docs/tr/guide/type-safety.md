# Tip Güvenliği

`dialex generate`, `src/dialex.generated.ts` dosyasının yanına `src/dialex-env.d.ts` dosyasını yazar. Dört arayüzü genişletir:

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

Sonuç:

- `Locales`, yapılandırdığınız yerel ayarlara daralır (yapılandırmada `locales` gerekir; aksi halde `string` olarak kalır).
- `getDictionary("home")`, `useDictionary("home")` ve `req.getDictionary("home")` sözlük adlarını otomatik tamamlar ve `greeting(name: string)` gibi fonksiyon imzaları dahil tam içerik tipini döndürür.
- Bilinmeyen adlar yine de derlenir (anahtar tipi `keyof DictionaryRegistry | (string & {})` olur) ve `any` döndürür.
- `t("cart.items", { count: 3 })`, mesajın ICU argümanlarına (`MessageArguments`) göre denetlenir: eksik, yanlış yazılmış ya da yanlış tipte bir argüman derleme hatasıdır. Bkz. [ICU Mesajları](./icu.md#types).

`src/dialex-env.d.ts` dosyasının `tsconfig.json` tarafından kapsandığından emin olun.
