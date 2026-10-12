# Tipler

`dialexjs` tipleri ve iki üretilen dosyanın içeriği. Aksi belirtilmedikçe bu sayfadaki her şey bir tiptir; `import type { Locales } from "dialexjs"` ile içe aktarın.

## Üretilen dosyalar

`dialex generate` yan yana iki dosya yazar (bkz. [`dialex generate`](../cli/generate.md)).

**`dialex.generated.ts`** şunları dışa aktarır:

| Dışa aktarım    | Açıklama                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | Sözlük tanımlarının dizisi. Aynı zamanda varsayılan dışa aktarımdır                                     |
| `dictionaryMap` | Doğrudan erişim için `{ [name]: dictionary }`                                                           |
| `config`        | İstemci için güvenli ayarlar: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`          |
| `locales`       | Yapılandırılmış yerel ayarlar, salt okunur bir demet olarak; dil değiştirici için kullanışlıdır         |
| `Locale`        | `(typeof locales)[number]`: yapılandırılmış yerel ayarların birleşimi                                   |
| `dialex`        | `{ dictionaries, config }`, tembel yüklemede `{ config, loaders }`. Bir provider'a ya da adaptöre yayın |

**`dialex-env.d.ts`**, `dialexjs`'in ve kullandığınız her framework giriş noktasının `Register`, `DictionaryRegistry` ve `MessageArguments` arayüzlerini genişletir. `getDictionary("home")` ve `t("home.title")` ifadelerinin tipli olmasının nedeni budur. `tsconfig.json` dosyanıza ekleyin.

## Kayıtlar

Üretilen bildirimlerin doldurduğu boş arayüzlerdir.

| Arayüz               | Şununla genişletilir                                                                             | Etkisi                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `Register`           | `locales: "en" \| "tr"`                                                                          | `Locales` tipini yapılandırılmış yerel ayarlarınıza daraltır  |
| `DictionaryRegistry` | Her sözlük için bir özellik: adı ve içerik tipi                                                  | Sözlük adlarını, `getDictionary`'yi ve `t()` yollarını tipler |
| `MessageArguments`   | `{ "cart.items": { count: number } }`: her mesajın ICU argümanları, `dictionary.key` yoluna göre | `t("cart.items", { count })` denetlenir                       |

## Yardımcı tipler

| Tip                          | Tanım                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Locales`                    | Yapılandırılmış yerel ayarlarınızın birleşimi ya da `dialex generate` çalışmadan önce `string`                                   |
| `DictionaryKey`              | Bir sözlük adı: kayıtlı adlar (otomatik tamamlamayla) ya da hiçbiri kayıtlı değilse herhangi bir `string`                        |
| `ResolveDictionaryType<K>`   | `K` adlı sözlüğün içerik tipi ya da `any`                                                                                        |
| `Dictionary<T>`              | `Record<Locales, T>`: her yerel ayar için bir içerik nesnesi                                                                     |
| `DictionaryDefinition<N, T>` | `{ name: N; dictionary: Record<string, T> }`: `defineDictionary`'nin döndürdüğü                                                  |
| `Translate`                  | `t` tipi: `<P extends TranslationPath>(path: P, ...args: TranslationArgs<P>) => TranslationResult<P>`                            |
| `TranslationPath`            | Kayıtlı bir sözlüğün her `dictionary.key.path` değeri ya da `string`                                                             |
| `TranslationArgs<P>`         | Bir fonksiyon yaprağının kendi parametreleri, ICU mesajı için `[values: MessageArguments[P]]`, aksi halde `[values?: IcuValues]` |
| `TranslationResult<P>`       | Dize ya da bir fonksiyon yaprağının dönüş tipi                                                                                   |
| `PathsOf<T>`                 | Bir sözlük içerik tipi `T`'nin her yaprağının noktalı yolları                                                                    |

## Örnek

```ts
import type { Locales } from "dialexjs";

import { locales, type Locale } from "./dialex.generated";

// "en" | "tr" once `dialex generate` has run
const current: Locales = "tr";

// the same union, from the generated file
const options: readonly Locale[] = locales;
```

İlgili tipler, onları kullanan fonksiyonların sayfalarındadır: [`DialexConfig`](./core.md#dialexconfig), [`DialexSource`](./core.md#generated-file-types), [`PluralForms`](./formatting.md#types) ve [`IcuValues`](./icu.md#types-and-errors).
