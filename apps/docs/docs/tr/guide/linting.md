# ESLint ve oxlint ile lint

`@dialexjs/eslint-plugin`, Dialex sorunlarını diğer lint hatalarınızın zaten bulunduğu yerde bildirir: terminalde, CI'da ve ESLint ya da oxlint çalıştıran her editörde. oxlint ESLint tarzı eklentileri yüklediği için iki linter için tek bir pakettir.

Lint edilen dosyanın üstünde bir `dialex.config.*` gerekir; o olmayan projelerde hiçbir şey yapmaz. `dialex check` gibi, sözlükleri ve yapılandırmayı sözdizimi ağacından okur ve proje kodunu asla çalıştırmaz.

## ESLint

Kurun, ardından yapılandırmasını `eslint.config.js` dosyasına ekleyin:

```sh
npm install --save-dev @dialexjs/eslint-plugin
```

```js
import dialex from "@dialexjs/eslint-plugin";

export default [dialex.configs.recommended];
```

## oxlint

oxlint'in paylaşılabilir yapılandırması yoktur; eklentiyi ve kuralları `.oxlintrc.json` içinde kendiniz listeleyin:

```json
{
  "jsPlugins": ["@dialexjs/eslint-plugin"],
  "rules": {
    "dialex/no-unknown-dictionary": "error",
    "dialex/no-unknown-path": "error",
    "dialex/no-dynamic-key": "warn",
    "dialex/valid-dictionary": "error"
  }
}
```

oxlint'in JS eklentileri alfa aşamasındadır ve eklenti kurallarını `.vue`, `.svelte` ya da `.astro` dosyalarında çalıştırmaz. Bunları `dialex check` ve editör uzantıları yine kapsar.

## Kurallar

| Kural                          | Bildirdiği                                                                                                     | `recommended` |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------- |
| `dialex/no-unknown-dictionary` | `getDictionary("x")`, `useDictionary("x")` ya da `@DialexDictionary("x")` var olmayan bir sözlüğü adlandırıyor | `error`       |
| `dialex/no-unknown-path`       | `t("a.nope")`, `a` bilinen bir sözlük ama böyle bir anahtarı yok                                               | `error`       |
| `dialex/no-dynamic-key`        | Dize değişmezi olmayan bir sözlük adı ya da anahtar; Dialex bunu denetleyemez                                  | `warn`        |
| `dialex/valid-dictionary`      | `dialex check`'in bir sözlük dosyasında bulduklarının tümü                                                     | `error`       |
| `dialex/no-literal-string`     | Bir sözlükten gelmek yerine JSX içine yazılmış metin                                                           | kapalı        |

### no-unknown-dictionary

`unknown-dictionary` tanısıyla aynı denetim. Kodda `dictionaries: { name: ... }` ile kaydedilen sözlük bilinen sayılır ve yorumlar hiçbir zaman denetlenmez.

### no-unknown-path

`unknown-path` ile aynı denetim. Dialex'in tanımadığı sözlüklerin anahtarları yok sayılır, çünkü `t()` başka bir kütüphaneye ait olabilir.

### no-dynamic-key

`getDictionary(name)` ve ``t(`home.${key}`)`` doğrulanamaz. Çıplak `t` yalnızca `dialexjs`'ten içe aktarma yapan dosyalarda denetlenir; başka kütüphaneler de bu adı kullanır.

### valid-dictionary

Sözlük dosyalarında, editördeki metin üzerinde çalışır ve `missing-key`, `missing-locale`, `invalid-icu` ve `todo-placeholder` gibi sözlük [kodlarını](./diagnostics.md) bildirir. Kullanılmayan anahtarlar ve sözlükler, tüm projeyi gören `dialex check`'e bırakılır. Kodları `ignore` ile atlayın:

```json
{ "dialex/valid-dictionary": ["error", { "ignore": ["todo-placeholder"] }] }
```

### no-literal-string

Harf içeren JSX metnini ve `title`, `alt`, `placeholder`, `aria-label` ile `label` değerlerini işaretler. Çoğu projede kalmasında sakınca olmayan metinler bulunduğu için `recommended` içinde kapalıdır. Seçenekler:

```json
{
  "dialex/no-literal-string": [
    "warn",
    { "attributes": ["title", "alt"], "ignore": ["^OK$"], "ignoreComponents": ["Trans", "code"] }
  ]
}
```

`attributes` öznitelik listesini değiştirir, `ignore` kırpılmış metinle eşleştirilen düzenli ifadelerin listesidir, `ignoreComponents` içeriği atlanan öğeleri adlandırır (varsayılan: `Trans`, `code`, `pre`, `script` ve `style`).

## Yapılandırma

Kurallar bir kez, `dialex.config.ts` içindeki `lint.rules` altında yapılandırılır. `dialex check`, editör uzantıları ve bu ESLint ile oxlint kuralları hep onu okur; böylece bir denetim her yerde aynı seçeneklerle açık ya da kapalıdır.

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lint: {
    rules: {
      "unused-key": "off",
      "missing-key": "warn",
      "literal-string": ["warn", { ignore: ["^OK$"] }],
    },
  },
});
```

Anahtarlar [tanı kodlarıdır](./diagnostics.md); buna yalnızca linter eklentisinin değerlendirdiği `dynamic-key` ve `literal-string` eklenir. Değer `"off"`, `"warn"`, `"error"` ya da `[level, options]` olabilir. Seviye, `dialex check` ve editörlerin sorunu nasıl bildirdiğini değiştirir. ESLint'te `dialex.configs.recommended`'ın kurala verdiği önem derecesidir; ESLint'in çalıştığı dizindeki `dialex.config.*` dosyasından okunur ve `literal-string`, `recommended` içinde yalnızca burada ayarlarsanız açıktır.

oxlint önem derecelerini hesaplanamayan `.oxlintrc.json` dosyasından okur; kuralları orada istediğiniz seviyeyle listeleyin. `dialex.config.ts` içindeki `"off"` ve seçenekler yine geçerlidir, yani orada kapattığınız denetim sessiz kalır. `valid-dictionary` birçok kod için tek bir kuraldır ve linter onu tek bir seviyede gösterir; kod başına seviyeler `dialex check` ve editörlerde geçerlidir. Bir kurala linter'ın kendi yapılandırmasında verilen seçenekler `dialex.config.ts` içindekileri geçersiz kılar.

## Bir bildirimi susturma

Linter'ın kendi yorumlarını kullanın, örneğin `// eslint-disable-next-line dialex/no-unknown-dictionary`. [Tanılar](./diagnostics.md) sayfasındaki `dialex-ignore` yorumları `dialex check` ve editörler içindir; eklenti onları okumaz.

## Editörler

Editörünüz bu sorunları ESLint ya da oxlint'ten zaten gösteriyorsa, her biri bir kez görünsün diye Dialex'in kendi kopyasını kapatın. Üzerine gelme, tamamlama ve hızlı düzeltmeler çalışmaya devam eder. VS Code'da:

```json
{ "dialex.diagnostics": false }
```

Zed'de `lsp.dialex.settings` altında `diagnostics` değerini `false` yapın ([Zed ve diğer editörler](./zed.md)).
