# Anahtar Yolları (`t`)

`t`, `getDictionary(name).key` kullanımına ek olarak bir değeri noktalı yola göre okur. Üretilen kayıt defterinden tiplendiği için yollar otomatik tamamlanır ve argüman tipleri denetlenir.

```ts
t("home.title"); // "Welcome"
t("home.nav.about"); // nested objects use more dots
t("home.greeting", "Ada"); // function leaves receive the extra arguments
```

Yaprak bir metinse ve bir değerler nesnesi verirseniz, metin bir [ICU mesajı](./icu.md) olarak biçimlendirilir: `t("cart.items", { count: 3 })`.

Bilinmeyen yollar bir uyarı kaydeder ve yolun kendisini döndürür.

## Nerede kullanılabilir

| Ortam           | `t` nasıl alınır                                   |
| --------------- | -------------------------------------------------- |
| React           | `dialexjs/react` içinden `const t = useT()`        |
| Vue / Nuxt      | `dialexjs/vue` içinden `const t = useT()`          |
| Sunucu (Next)   | `dialexjs/server` içinden `const t = getT(locale)` |
| Elysia          | İstek bağlamındaki `t`                             |
| SvelteKit       | `event.locals.t`                                   |
| Astro           | `Astro.locals.t`                                   |
| Başka her yerde | `dialexjs` içinden `createT(getDictionary)`        |

## Tipler

`dialex generate` sonrasında kayıt defteri `dialexjs` modülünü genişletir; böylece `TranslationPath`, `"home.title" | "home.greeting" | "home.nav.about"` gibi bir birleşim tipine dönüşür. Bilinmeyen bir yol ya da yanlış tipte bir argüman vermek derleme hatasıdır:

```ts
t("home.greeting", 42); // Error: number is not assignable to string
t("home.nope"); // Error: not a valid path
```

Kayıt defteri üretilmeden önce `t` herhangi bir metni kabul eder.
