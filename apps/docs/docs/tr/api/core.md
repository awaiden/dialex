# Core

`dialexjs` giriş noktası: yapılandırma, sözlükler ve `t` fonksiyonu. Biçimlendirme yardımcıları [Biçimlendirme](./formatting.md), tipler [Tipler](./types.md) sayfasındadır.

## `defineConfig(config)`

```ts
function defineConfig(config: DialexConfig): DialexConfig;
```

`dialex.config.ts` dosyasına tiplerini verir ve nesneyi değiştirmeden döndürür.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({ defaultLocale: "en", locales: ["en", "tr"] });
```

Tüm seçenekler için [Yapılandırma](../guide/configuration.md) sayfasına bakın.

## `defineDictionary(name, dictionary)`

```ts
function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;

function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
```

| Parametre    | Açıklama                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `name`       | Sözlük adı: her `t()` yolunun ilk bölümü ve `getDictionary` argümanı. Benzersiz ve bir sabit değer olmalıdır |
| `dictionary` | Her yerel ayarı içeriğine eşleyen bir nesne: dizeler, iç içe nesneler ya da fonksiyonlar                     |

Sözlüğü [`globalDictionaries`](#globaldictionaries) içine kaydeder ve `{ name, dictionary }` döndürür. `dialex generate` bulabilsin diye her sözlüğü kendi `*.content.ts` dosyasında varsayılan dışa aktarım olarak tutun. Bkz. [Sözlükler](../guide/dictionaries.md).

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Welcome", greeting: (name: string) => `Hello, ${name}!` },
  tr: { title: "Hoş geldiniz", greeting: (name: string) => `Merhaba, ${name}!` },
});
```

<a id="createt"></a>

## `createT(getDictionary, locale?)`

```ts
function createT(getDictionary: (name: any) => any, locale?: string): Translate;
```

Bir `getDictionary(name)` erişimcisinin üzerine `t("dictionary.key.path", ...args)` fonksiyonu kurar. Framework adaptörleri bunu sizin yerinize yapar; bir betikte ya da testte kendiniz çağırın.

| Parametre       | Açıklama                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| `getDictionary` | Yerel ayar için `name` adlı sözlüğün içeriğini döndürür                   |
| `locale`        | ICU mesajlarını biçimlendirmekte kullanılan yerel ayar. Varsayılan `"en"` |

`t(path, ...args)` şunu döndürür:

| Yol şuraya çıkar                           | Sonuç                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Bir fonksiyon                              | `fn(...args)`: ek argümanlar fonksiyona gider                               |
| Bir dize ve değer nesnesi yok              | Dize olduğu gibi. Hiçbir şey ayrıştırılmaz                                  |
| Bir dize ve bir değer nesnesi (`{ n: 3 }`) | `locale` için [ICU mesajı](../guide/icu.md) olarak biçimlendirilmiş dize    |
| Hiçbir şey                                 | `console.warn("[dialex] Translation path ... not found.")` ve yolun kendisi |

Biçimlendirilemeyen bir dize (geçersiz ICU ya da eksik bir değer) `console.warn` ile bildirilir ve değiştirilmeden döndürülür; böylece bozuk bir dize hiçbir sayfayı çökertmez. Bkz. [Anahtar yolları](../guide/key-paths.md).

## `globalDictionaries`

```ts
const globalDictionaries: Record<string, Record<string, any>>;
```

`defineDictionary`'nin doldurduğu süreç içi kayıt. Adaptörlere `dictionaries` vermezseniz bunu okurlar. Sözlük dosyaları içe aktarılana kadar boştur; bu yüzden sözlükleri iletmenin güvenilir yolu üretilen `dialex` nesnesidir.

## `DEFAULT_CONFIG`

```ts
const DEFAULT_CONFIG: {
  defaultLocale: string; // "en"
  locales: string[]; // []
  include: string | string[]; // "**/*.content.ts"
  fallbacks: Record<string, string[]>; // {}
  prefixDefault: boolean; // true
  lazy: boolean | "locale"; // false
};
```

Eksik bir ayar ya da eksik yapılandırma dosyasının tamamı için bütün araçların kullandığı değerler. `locales` boştur: `dialex generate` bu durumda sözlüklerinizin tanımladığı yerel ayarları kullanır.

## Yapılandırma tipleri

### `DialexConfig`

`dialex.config.ts` dosyasının biçimi. Her alan isteğe bağlıdır.

| Alan            | Tip                        | Varsayılan          | Açıklama                                                                         |
| --------------- | -------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                   | `"en"`              | Hiçbiri çözümlenemediğinde kullanılan yerel ayar                                 |
| `locales`       | `string[]`                 | —                   | Desteklenen yerel ayarlar                                                        |
| `include`       | `string \| string[]`       | `"**/*.content.ts"` | Sözlük dosyalarının glob'u                                                       |
| `exclude`       | `string[]`                 | —                   | `node_modules`, derleme çıktısı ve `.gitignore` dışında asla taranmayan glob'lar |
| `output`        | `string`                   | `src/` ya da kök    | `dialex.generated.ts` dosyasının yazıldığı yer                                   |
| `configFile`    | `string`                   | —                   | Yapılandırma dosyasının özel yolu                                                |
| `fallbacks`     | `Record<string, string[]>` | —                   | Açık [yedek zincirleri](../guide/fallbacks.md)                                   |
| `prefixDefault` | `boolean`                  | `true`              | Varsayılan yerel ayarın da URL öneki alıp almayacağı                             |
| `lazy`          | `boolean \| "locale"`      | `false`             | Sözlükleri isteğe bağlı yükle. Bkz. [Tembel yükleme](../guide/lazy-loading.md)   |
| `translate`     | `TranslateConfig`          | —                   | [`dialex translate`](../cli/translate.md) ayarları                               |

### `TranslateConfig`

| Alan           | Tip                 | Açıklama                                                           |
| -------------- | ------------------- | ------------------------------------------------------------------ |
| `provider`     | `TranslateProvider` | Dizeleri çeviren arka uç. Zorunlu                                  |
| `sourceLocale` | `string`            | Çevirinin yapılacağı kaynak yerel ayar. Varsayılan `defaultLocale` |

### `TranslateProvider`

```ts
interface TranslateProvider {
  name?: string;
  supportsIcu?: boolean;
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}
```

`translate` düz dizeler alır ve her girdi için aynı sırada bir çeviri döndürmelidir. `supportsIcu` değerini yalnızca provider `plural` ve `select` mesajlarının yapısını koruyorsa ayarlayın; bu sözdizimine sahip mesajlar, korumayan provider'lara gönderilmez. Bkz. [`dialex translate`](../cli/translate.md).

<a id="generated-file-types"></a>

## Üretilen dosya tipleri

| Tip                  | Açıklama                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexSource`       | Üretilen `dialex` dışa aktarımının taşıdığı ve provider'ların kabul ettiği şey: `dictionaries`, `config` ve tembel modda `loaders`                                |
| `DialexClientConfig` | `dialex generate`'in `dialex.generated.ts` içine kopyaladığı ayarlar: `defaultLocale`, `locales`, `fallbacks`, `prefixDefault`, `lazy`. `translate` asla eklenmez |
| `DictionaryLoader`   | `() => Promise<any>`: bir sözlüğü ya da bir yerel ayarını yükler                                                                                                  |
| `DictionaryLoaders`  | Sözlük adına göre loader'lar. `lazy: "locale"` ile bir sözlük her yerel ayarı kendi loader'ına eşler                                                              |
