# Yapılandırma

Dialex, proje kökünden `dialex.config.*` (veya `i18n.config.*`) dosyasını yükler; `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` ve `.json` desteklenir.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Seçenek         | Tip                           | Varsayılan          | Açıklama                                                                                                                                                                        |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Hiçbir şey çözülemediğinde kullanılan yerel ayar                                                                                                                                |
| `locales`       | `string[]`                    | —                   | Desteklenen yerel ayarlar; yerel ayar tip daraltmasını ve tutarlılık denetimlerini etkinleştirir. Verilmezse `dx generate`, sözlüklerinizin tanımladığı yerel ayarları kullanır |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Sözlük dosyaları için glob(lar)                                                                                                                                                 |
| `exclude`       | `string[]`                    | —                   | Projeye göre göreli, sözlükler veya kaynaklar için asla taranmayan glob'lar                                                                                                     |
| `output`        | `string`                      | —                   | `dialex generate` komutunun `dialex.generated.ts` dosyasını yazacağı yer (projeye göre); tip bildirimleri yanına yazılır. Varsayılan `src/`, yoksa proje kökü                   |
| `configFile`    | `string`                      | —                   | Özel yapılandırma yolu                                                                                                                                                          |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Yerel ayar başına açık [yedek zincirleri](./fallbacks.md)                                                                                                                       |
| `prefixDefault` | `boolean`                     | `true`              | Varsayılan yerel ayarın da URL öneki alıp almayacağı. `DialexLink` ve [yönlendirme yardımcıları](./routing.md) tarafından okunur                                                |
| `lazy`          | `boolean \| "locale"`         | `false`             | Sözlükleri isteğe bağlı yükler (istemci paketleri): `true` sözlük başına, `"locale"` sözlük ve dil başına böler. Bkz. [Tembel Yükleme](./lazy-loading.md)                       |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) için sağlayıcı                                                                                                                        |

Dialex `node_modules` klasörünü, derleme çıktısını ve `.gitignore` dosyalarınızın yok saydığı her şeyi atlar (bir monorepo içindeki paket için deponun `.gitignore` dosyası da dahil). Başka her şey için, örneğin commit ettiğiniz bir vendor klasörü için, `exclude` kullanın.

Dosya isteğe bağlıdır: olmadığında yukarıdaki tüm varsayılanlar geçerli olur. `dx generate`, çalışma zamanının ihtiyaç duyduğu ayarları (`translate` hariç) `dialex.generated.ts` içine kopyalar; bu yüzden dosyayı değiştirdikten sonra yeniden çalıştırın.

## Dosyanın bulunduğu yer

Araçlar proje kökünde (`dialex` komutunu çalıştırdığınız klasör ya da editörde projenin klasörü) önce `dialex.config.<ext>`, sonra `i18n.config.<ext>` arar; `<ext>`, `ts`, `mts`, `cts`, `js`, `mjs`, `cjs` ya da `json` olabilir. İlk bulunan kazanır. `-c, --config <path>` (ya da `dialex.configPath` editör ayarı) farklı bir dosyaya işaret eder. Bir monorepo'da yapılandırması olan her paket kendi projesidir; yalnızca sözlükleri olan bir paket varsayılanları kullanır.

## Araçlar onu nasıl okur

| Araç                                                        | Yapılandırmayı şöyle okur                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `dialex generate`, `check`, `export`, `import`, `translate` | Dosyayı çalıştırarak; böylece değerler hesaplanabilir (`locales: getLocales()`) |
| Yerel `dx`                                                  | Sözdizimi ağacını okuyarak. Hesaplanan her şey komutu Node CLI'ya devreder      |
| Editör eklentisi ve dil sunucusu                            | Sözdizimi ağacını okuyarak; asla çalıştırmaz                                    |

Sabit değerlerden (dizeler, diziler, boolean'lar) oluşan bir yapılandırma her yerde anlaşılır. Hesaplanan bir ayar editöre görünmez; editör onun için varsayılanı kullanır ve bir not düşer. Bir editörün `locales` bilmesi gerekiyorsa onları açıkça yazın. Bkz. [Yerel ikili dosyalar](./native.md).

## Örnekler

Bölgesel yedekleri olan ve varsayılan yerel ayarı önek olmadan sunan bir proje:

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "pt", "pt-BR", "es"],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
});
```

Kaynak klasörü `src/` olmayan ve bir vendor klasörü dışlanan bir framework:

```ts
export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  output: "app/dialex.generated.ts",
  exclude: ["vendor/**"],
});
```
